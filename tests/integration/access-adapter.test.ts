import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { UserId } from "@/lib/domain";
import { MAX_ROLE_DESCRIPTION } from "@/lib/domain";
import { createAccessRepository } from "@/lib/supabase/repositories/access";
import {
  authedClient,
  createTestUser,
  deleteTestUser,
  serviceClient,
  type TestUser,
} from "./client";

let admin: TestUser;
let nobody: TestUser;

beforeAll(async () => {
  [admin, nobody] = await Promise.all([
    createTestUser(),
    createTestUser({ admin: false }),
  ]);
});

afterAll(async () => {
  await Promise.all(
    [admin, nobody].filter(Boolean).map(user => deleteTestUser(user.id)),
  );
});

function repo(user: TestUser) {
  return createAccessRepository(authedClient(user.accessToken));
}

describe("access adapter", () => {
  it("maps the permission catalogue in the migration's order", async () => {
    const permissions = await repo(admin).listPermissions();

    expect(permissions.length).toBeGreaterThan(0);

    const first = permissions[0];
    expect(first.key).toBe("boardgames.create");
    expect(first.section).toBe("Jeux & barèmes");
    expect(first.action).toBe("create");
    expect(first.billable).toBe(false);
    expect(typeof first.sortOrder).toBe("number");

    const orders = permissions.map(p => p.sortOrder);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it("maps a role with the permissions it links to", async () => {
    const service = serviceClient();
    const { data: created } = await service
      .from("roles")
      .insert({ key: `adapter-${Date.now()}`, label: "Adaptateur" })
      .select("*")
      .single();
    const roleId = created?.id as string;

    try {
      await service
        .from("role_permissions")
        .insert({ role_id: roleId, permission_key: "faq.read" });

      const roles = await repo(admin).listRoles();
      const mine = roles.find(role => role.id === roleId);

      expect(mine?.label).toBe("Adaptateur");
      expect(mine?.isAdmin).toBe(false);
      expect(mine?.isSystem).toBe(false);
      expect(mine?.permissionKeys).toEqual(["faq.read"]);

      // The seeded administrator role links nothing: `is_admin` is the grant.
      const seeded = roles.find(role => role.key === "admin");
      expect(seeded?.isAdmin).toBe(true);
      expect(seeded?.isSystem).toBe(true);
      expect(seeded?.permissionKeys).toEqual([]);
    } finally {
      await service.from("roles").delete().eq("id", roleId);
    }
  });

  it("returns the caller's own permissions", async () => {
    const catalogue = await repo(admin).listPermissions();

    expect(await repo(admin).myPermissions()).toHaveLength(catalogue.length);
    expect(await repo(nobody).myPermissions()).toEqual([]);
  });

  it("returns no role at all to an account without `roles.read`", async () => {
    // RLS filters rather than fails, so the adapter hands back an empty list
    // and the screen is the one that has to explain why.
    expect(await repo(nobody).listRoles()).toEqual([]);
    expect((await repo(nobody).listPermissions()).length).toBeGreaterThan(0);
  });
});

describe("access adapter — handing a role over", () => {
  const created: string[] = [];

  async function compose(label: string) {
    const role = await repo(admin).createRole(label, null, ["faq.read"]);
    created.push(role.id);

    return role;
  }

  afterAll(async () => {
    const service = serviceClient();

    for (const id of created) {
      await service.from("user_roles").delete().eq("role_id", id);
      await service.from("roles").delete().eq("id", id);
    }
  });

  it("lists the accounts with the roles each of them wears", async () => {
    const accounts = await repo(admin).listAccounts();
    const mine = accounts.find(account => account.userId === admin.id);
    const seeded = (await repo(admin).listRoles()).find(
      role => role.key === "admin",
    );

    expect(mine?.email).toBe(admin.email);
    expect(mine?.roleIds).toEqual([seeded?.id]);
    expect(typeof mine?.createdAt).toBe("string");

    const bare = accounts.find(account => account.userId === nobody.id);

    expect(bare?.roleIds).toEqual([]);
  });

  it("hands a role over and takes it back", async () => {
    const role = await compose(`Distribué ${Date.now()}`);
    const subject = await createTestUser({ admin: false });

    try {
      await repo(admin).assignRole(subject.id as UserId, role.id);

      const worn = (await repo(admin).listAccounts()).find(
        account => account.userId === subject.id,
      );

      expect(worn?.roleIds).toContain(role.id);

      await repo(admin).unassignRole(subject.id as UserId, role.id);

      const bare = (await repo(admin).listAccounts()).find(
        account => account.userId === subject.id,
      );

      expect(bare?.roleIds).toEqual([]);
    } finally {
      await deleteTestUser(subject.id);
    }
  });

  it("reports the refusal of a role that was not worn in the first place", async () => {
    // A DELETE nobody is allowed to make and a DELETE that matches nothing look
    // exactly alike from here: zero rows, no error. Both are « ça n'a pas eu
    // lieu », which is what the screen has to say.
    const role = await compose(`Fantôme ${Date.now()}`);

    await expect(
      repo(admin).unassignRole(nobody.id as UserId, role.id),
    ).rejects.toThrow(/refusé/);
  });

  it("refuses an account with no right over roles both ways round", async () => {
    const role = await compose(`Convoité ${Date.now()}`);
    const subject = await createTestUser({ admin: false });

    try {
      expect(await repo(nobody).listAccounts()).toEqual([]);
      await expect(
        repo(nobody).assignRole(subject.id as UserId, role.id),
      ).rejects.toThrow(/Attribution du rôle/);

      await repo(admin).assignRole(subject.id as UserId, role.id);

      await expect(
        repo(nobody).unassignRole(subject.id as UserId, role.id),
      ).rejects.toThrow(/refusé/);

      const survivor = (await repo(admin).listAccounts()).find(
        account => account.userId === subject.id,
      );

      expect(survivor?.roleIds).toContain(role.id);
    } finally {
      await deleteTestUser(subject.id);
    }
  });

  it("never lets an administrator role be handed out from the app", async () => {
    const [seeded] = (await repo(admin).listRoles()).filter(
      role => role.isAdmin,
    );
    const subject = await createTestUser({ admin: false });

    try {
      await expect(
        repo(admin).assignRole(subject.id as UserId, seeded.id),
      ).rejects.toThrow(/Attribution du rôle/);
    } finally {
      await deleteTestUser(subject.id);
    }
  });
});

describe("access adapter — composing a role", () => {
  const created: string[] = [];

  async function compose(
    label: string,
    keys: string[],
    description: string | null = null,
  ) {
    const role = await repo(admin).createRole(label, description, keys);
    created.push(role.id);

    return role;
  }

  afterAll(async () => {
    const service = serviceClient();

    for (const id of created) {
      await service.from("user_roles").delete().eq("role_id", id);
      await service.from("roles").delete().eq("id", id);
    }
  });

  it("creates a role under a key derived from its name", async () => {
    const role = await compose(`Gestionnaire ${Date.now()}`, [
      "faq.read",
      "games.read",
    ]);

    expect(role.key).toMatch(/^gestionnaire-\d+$/);
    expect(role.isAdmin).toBe(false);
    expect(role.assignedCount).toBe(0);
    expect([...role.permissionKeys].sort()).toEqual(["faq.read", "games.read"]);

    const listed = (await repo(admin).listRoles()).find(r => r.id === role.id);

    expect([...(listed?.permissionKeys ?? [])].sort()).toEqual([
      "faq.read",
      "games.read",
    ]);
    expect(listed?.assignedCount).toBe(0);
  });

  it("keeps what stays ticked, adds what was ticked, drops what was not", async () => {
    const role = await compose(`Réviseur ${Date.now()}`, [
      "faq.read",
      "games.read",
    ]);

    await repo(admin).setRolePermissions(role.id, ["faq.read", "faq.update"]);

    const listed = (await repo(admin).listRoles()).find(r => r.id === role.id);

    expect([...(listed?.permissionKeys ?? [])].sort()).toEqual([
      "faq.read",
      "faq.update",
    ]);
  });

  it("empties a role of everything it held", async () => {
    // The unticked-everything case takes its own path: there is no list to
    // filter the deletion by, so it deletes the lot.
    const role = await compose(`Dépouillé ${Date.now()}`, ["faq.read"]);

    await repo(admin).setRolePermissions(role.id, []);

    const listed = (await repo(admin).listRoles()).find(r => r.id === role.id);

    expect(listed?.permissionKeys).toEqual([]);
  });

  it("renames a role and leaves the key it is filed under alone", async () => {
    const role = await compose(`Ancien ${Date.now()}`, [], "Ce qu'il fait.");

    expect(role.description).toBe("Ce qu'il fait.");

    await repo(admin).updateRoleIdentity(
      role.id,
      "Nouveau nom",
      "Autre chose.",
    );

    const listed = (await repo(admin).listRoles()).find(r => r.id === role.id);

    expect(listed?.label).toBe("Nouveau nom");
    expect(listed?.description).toBe("Autre chose.");
    expect(listed?.key).toBe(role.key);
  });

  it("clears a description that is taken back", async () => {
    const role = await compose(`Bavard ${Date.now()}`, [], "Trop de mots.");

    await repo(admin).updateRoleIdentity(role.id, role.label, null);

    const listed = (await repo(admin).listRoles()).find(r => r.id === role.id);

    expect(listed?.description).toBeNull();
  });

  it("refuses a description longer than the app lets anyone type", async () => {
    // `maxLength` on the textarea is a courtesy to whoever types; the limit
    // that counts is the check constraint, which is what anything speaking to
    // PostgREST straight runs into.
    const role = await compose(`Prolixe ${Date.now()}`, []);
    const tooLong = "a".repeat(MAX_ROLE_DESCRIPTION + 1);

    await expect(
      repo(admin).updateRoleIdentity(role.id, role.label, tooLong),
    ).rejects.toThrow(/Modification du rôle/);

    await expect(
      repo(admin).createRole(`Verbeux ${Date.now()}`, tooLong, []),
    ).rejects.toThrow(/Création du rôle/);

    const listed = (await repo(admin).listRoles()).find(r => r.id === role.id);

    expect(listed?.description).toBeNull();
  });

  it("deletes a role nobody wears", async () => {
    const role = await compose(`Éphémère ${Date.now()}`, ["faq.read"]);

    await repo(admin).deleteRole(role.id);

    expect(
      (await repo(admin).listRoles()).find(r => r.id === role.id),
    ).toBeUndefined();
  });

  it("counts who wears a role, and refuses to delete it while somebody does", async () => {
    const role = await compose(`Porté ${Date.now()}`, ["faq.read"]);
    const wearer = await createTestUser({ admin: false });

    try {
      await serviceClient()
        .from("user_roles")
        .insert({ user_id: wearer.id, role_id: role.id });

      const listed = (await repo(admin).listRoles()).find(
        r => r.id === role.id,
      );

      expect(listed?.assignedCount).toBe(1);

      // The cascade on `user_roles.role_id` means the delete would otherwise
      // succeed and quietly strip the role off him.
      await expect(repo(admin).deleteRole(role.id)).rejects.toThrow(/attribué/);

      const survivor = (await repo(admin).listRoles()).find(
        r => r.id === role.id,
      );

      expect(survivor?.id).toBe(role.id);
    } finally {
      await deleteTestUser(wearer.id);
    }
  });

  it("refuses to delete a role the application ships", async () => {
    const [seeded] = (await repo(admin).listRoles()).filter(
      role => role.isSystem,
    );

    await expect(repo(admin).deleteRole(seeded.id)).rejects.toThrow(
      /fourni par l'application/,
    );
  });

  it("refuses every write to an account that holds no right over roles", async () => {
    const role = await compose(`Convoité ${Date.now()}`, []);

    // An insert refused by RLS errors; an update or a delete refused by RLS
    // touches zero rows and reports success — hence the row asked back.
    await expect(repo(nobody).createRole("Intrus", null, [])).rejects.toThrow();
    await expect(
      repo(nobody).updateRoleIdentity(role.id, "Intrus", null),
    ).rejects.toThrow(/refusée/);
    await expect(
      repo(nobody).setRolePermissions(role.id, ["faq.read"]),
    ).rejects.toThrow(/Attribution/);
    await expect(repo(nobody).deleteRole(role.id)).rejects.toThrow(/refusée/);

    const survivor = (await repo(admin).listRoles()).find(
      r => r.id === role.id,
    );

    expect(survivor?.label).toBe(role.label);
  });
});
