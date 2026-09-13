import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { RoleId } from "@/lib/domain";
import { createAccessRepository } from "@/lib/supabase/repositories/access";
import {
  anonClient,
  authedClient,
  createTestUser,
  deleteTestUser,
  serviceClient,
  type TestUser,
} from "./client";

// Looking at the application as a role, while staying signed in as oneself.
//
// The whole feature rests on one invariant — a simulation can only ever SHRINK
// — and on one escape hatch: leaving never asks for a permission, because the
// account that most needs to leave is the one whose simulation just took its
// rights away. Both are asserted here rather than trusted, since the interface
// has no say in either: it is `has_permission()` that narrows, for all 38
// policies at once.

let admin: TestUser;
let adminRoleId: RoleId;

beforeAll(async () => {
  admin = await createTestUser();

  const { data } = await serviceClient()
    .from("roles")
    .select("id")
    .eq("key", "admin")
    .single();

  adminRoleId = data?.id as RoleId;
});

afterAll(async () => {
  if (admin) {
    await deleteTestUser(admin.id);
  }
});

function repo(user: TestUser) {
  return createAccessRepository(authedClient(user.accessToken));
}

/** A throwaway role holding exactly the listed keys, and nothing else. */
async function roleWith(keys: string[]) {
  const service = serviceClient();
  const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const { data } = await service
    .from("roles")
    .insert({ key: `sim-${suffix}`, label: `Simulé ${suffix}` })
    .select("*")
    .single();
  const id = data?.id as RoleId;

  if (keys.length > 0) {
    await service
      .from("role_permissions")
      .insert(keys.map(key => ({ role_id: id, permission_key: key })));
  }

  return {
    id,
    label: data?.label as string,
    async dispose() {
      await service.from("roles").delete().eq("id", id);
    },
  };
}

/** An account wearing exactly the listed keys, through a role of its own. */
async function userWith(keys: string[]) {
  const service = serviceClient();
  const user = await createTestUser({ admin: false });
  const role = await roleWith(keys);

  await service
    .from("user_roles")
    .insert({ user_id: user.id, role_id: role.id });

  return {
    user,
    roleId: role.id,
    async dispose() {
      await deleteTestUser(user.id);
      await role.dispose();
    },
  };
}

describe("role simulation — what it narrows", () => {
  it("reports no simulation for an account that is simply itself", async () => {
    await expect(repo(admin).currentRoleSimulation()).resolves.toBeNull();
  });

  it("cuts an administrator down to the single key the role lists", async () => {
    const role = await roleWith(["games.read"]);
    const watcher = await createTestUser();
    const db = repo(watcher);

    try {
      const whole = await db.myPermissions();

      expect(whole.length).toBeGreaterThan(1);

      await db.startRoleSimulation([role.id]);

      const narrowed = await db.myPermissions();

      expect(narrowed).toEqual(["games.read"]);

      // …and it is the policies that narrowed, not a list on a screen.
      const created = await authedClient(watcher.accessToken)
        .from("players")
        .insert({ name: `Sim-${Date.now().toString(36)}` })
        .select("*");

      expect(created.error?.code).toBe("42501");
    } finally {
      await deleteTestUser(watcher.id);
      await role.dispose();
    }
  });

  it("names the roles it is looking through, and when the view lapses", async () => {
    // The labels come back from the function on purpose: simulating a role
    // without `roles.read` is exactly the case where the banner could no longer
    // read the table it would otherwise look the name up in.
    const role = await roleWith(["games.read"]);
    const watcher = await createTestUser();
    const db = repo(watcher);

    try {
      await db.startRoleSimulation([role.id]);

      const current = await db.currentRoleSimulation();

      expect(current?.roleIds).toEqual([role.id]);
      expect(current?.roleLabels).toEqual([role.label]);
      expect(Date.parse(current?.expiresAt ?? "")).toBeGreaterThan(Date.now());

      const roles = await authedClient(watcher.accessToken)
        .from("roles")
        .select("id");

      expect(roles.data).toEqual([]);
    } finally {
      await deleteTestUser(watcher.id);
      await role.dispose();
    }
  });

  it("takes the union of several roles, as an account wearing both would", async () => {
    const reader = await roleWith(["games.read"]);
    const faq = await roleWith(["faq.read"]);
    const watcher = await createTestUser();
    const db = repo(watcher);

    try {
      await db.startRoleSimulation([reader.id, faq.id]);

      const narrowed = await db.myPermissions();

      expect(narrowed.toSorted()).toEqual(["faq.read", "games.read"]);
    } finally {
      await deleteTestUser(watcher.id);
      await Promise.all([reader.dispose(), faq.dispose()]);
    }
  });

  it("replaces the view rather than adding to it", async () => {
    const first = await roleWith(["games.read"]);
    const second = await roleWith(["faq.read"]);
    const watcher = await createTestUser();
    const db = repo(watcher);

    try {
      await db.startRoleSimulation([first.id]);
      await db.startRoleSimulation([second.id]);

      expect(await db.myPermissions()).toEqual(["faq.read"]);
    } finally {
      await deleteTestUser(watcher.id);
      await Promise.all([first.dispose(), second.dispose()]);
    }
  });
});

describe("role simulation — it can only shrink", () => {
  it("hands back nothing the account does not already hold", async () => {
    // The dangerous shape: a modest account simulating a generous role. The
    // answer is the intersection, so the two rights he does not have stay out.
    const modest = await userWith(["roles.read", "games.read"]);
    const generous = await roleWith([
      "games.read",
      "games.delete",
      "roles.update",
    ]);

    try {
      const db = repo(modest.user);

      await db.startRoleSimulation([generous.id]);

      expect(await db.myPermissions()).toEqual(["games.read"]);
    } finally {
      await modest.dispose();
      await generous.dispose();
    }
  });

  it("refuses an administrator role at the door", async () => {
    // It grants by carrying a flag, never by listing rights — so simulating it
    // would empty the application instead of narrowing it.
    await expect(
      repo(admin).startRoleSimulation([adminRoleId]),
    ).rejects.toThrow(/administrateur/);
  });

  it("refuses a role that does not exist", async () => {
    await expect(
      repo(admin).startRoleSimulation([
        "00000000-0000-0000-0000-000000000000" as RoleId,
      ]),
    ).rejects.toThrow(/inconnu/);
  });

  it("refuses an empty choice", async () => {
    await expect(repo(admin).startRoleSimulation([])).rejects.toThrow(
      /au moins un rôle/,
    );
  });

  it("refuses an account that may not read the roles in the first place", async () => {
    const outsider = await userWith(["games.read"]);
    const role = await roleWith(["games.read"]);

    try {
      await expect(
        repo(outsider.user).startRoleSimulation([role.id]),
      ).rejects.toThrow(/Consulter les rôles/);
    } finally {
      await outsider.dispose();
      await role.dispose();
    }
  });

  it("is out of reach of an anonymous visitor", async () => {
    const { error } = await anonClient().rpc("current_role_simulation");

    expect(error).not.toBeNull();
  });

  it("keeps the table itself out of reach of a signed-in account", async () => {
    // Everything goes through the functions, so the row that decides what a
    // session may see is not one that session can write.
    const db = authedClient(admin.accessToken);

    const read = await db.from("permission_simulations").select("*");

    expect(read.error?.code).toBe("42501");

    const written = await db
      .from("permission_simulations")
      .insert({
        user_id: admin.id,
        role_ids: [adminRoleId],
        expires_at: new Date(Date.now() + 60_000).toISOString(),
      })
      .select("*");

    expect(written.error?.code).toBe("42501");
  });
});

describe("role simulation — the way out", () => {
  it("leaves a view that took away the right to leave it", async () => {
    // The one that matters: simulating « Joueur » removes `roles.update`, so
    // the account can no longer write the row holding it captive — unless
    // leaving asks for nothing at all, which is what this proves.
    const role = await roleWith(["games.read"]);
    const watcher = await createTestUser();
    const db = repo(watcher);

    try {
      await db.startRoleSimulation([role.id]);

      expect(await db.myPermissions()).toEqual(["games.read"]);

      await db.stopRoleSimulation();

      expect(await db.currentRoleSimulation()).toBeNull();
      expect((await db.myPermissions()).length).toBeGreaterThan(1);
    } finally {
      await deleteTestUser(watcher.id);
      await role.dispose();
    }
  });

  it("hands the rights back on its own once the view has lapsed", async () => {
    const role = await roleWith(["games.read"]);
    const watcher = await createTestUser();
    const db = repo(watcher);

    try {
      await db.startRoleSimulation([role.id]);

      // Aged out of band rather than waited out: the expiry is a quarter of an
      // hour, and a forgotten simulation must repair itself with nobody there.
      await serviceClient()
        .from("permission_simulations")
        .update({ expires_at: new Date(Date.now() - 1_000).toISOString() })
        .eq("user_id", watcher.id);

      expect(await db.currentRoleSimulation()).toBeNull();
      expect((await db.myPermissions()).length).toBeGreaterThan(1);
    } finally {
      await deleteTestUser(watcher.id);
      await role.dispose();
    }
  });

  it("says so plainly when leaving is refused", async () => {
    await expect(
      createAccessRepository(anonClient()).stopRoleSimulation(),
    ).rejects.toThrow(/Sortie de la vue simulée/);
  });
});
