import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  authedClient,
  createTestUser,
  deleteTestUser,
  serviceClient,
  type TestUser,
} from "./client";

// The other half of OWASP A01. `rls.test.ts` proves an anonymous visitor is
// refused; this file proves a *signed-in* one is too, until somebody hands him
// a role. That is the whole point of the RBAC socle: authentication stopped
// being authorisation.

let nobody: TestUser;
let admin: TestUser;
let adminRoleId: string;

beforeAll(async () => {
  [nobody, admin] = await Promise.all([
    createTestUser({ admin: false }),
    createTestUser(),
  ]);

  const { data } = await serviceClient()
    .from("roles")
    .select("id")
    .eq("key", "admin")
    .single();
  adminRoleId = data?.id as string;
});

afterAll(async () => {
  await Promise.all(
    [nobody, admin].filter(Boolean).map(user => deleteTestUser(user.id)),
  );
});

describe("RBAC — a signed-in account with no role holds nothing", () => {
  it("reads no boardgame, though the catalogue is seeded", async () => {
    const db = authedClient(nobody.accessToken);

    const seeded = await serviceClient().from("boardgames").select("id");
    expect(seeded.data?.length).toBeGreaterThan(0);

    const read = await db.from("boardgames").select("*");
    expect(read.error).toBeNull(); // RLS filters, it does not shout
    expect(read.data).toEqual([]);
  });

  it("is refused when creating a player", async () => {
    const { error } = await authedClient(nobody.accessToken)
      .from("players")
      .insert({ name: `Nobody-${Date.now().toString(36)}` })
      .select("*");

    expect(error?.code).toBe("42501");
  });

  it("changes nothing when updating a boardgame", async () => {
    const admin = serviceClient();
    const { data: seeded } = await admin
      .from("boardgames")
      .insert({ name: `RBAC-${Date.now()}` })
      .select("*")
      .single();
    const id = seeded?.id as string;

    try {
      // A refused UPDATE is silent: zero rows touched, no error at all.
      const update = await authedClient(nobody.accessToken)
        .from("boardgames")
        .update({ name: "Renamed by nobody" })
        .eq("id", id)
        .select("*");
      expect(update.error).toBeNull();
      expect(update.data).toEqual([]);

      const still = await admin
        .from("boardgames")
        .select("name")
        .eq("id", id)
        .single();
      expect(still.data?.name).toBe(seeded?.name);
    } finally {
      await admin.from("boardgames").delete().eq("id", id);
    }
  });

  it("sees the permission catalogue but no role", async () => {
    const db = authedClient(nobody.accessToken);

    const permissions = await db.from("permissions").select("key");
    expect(permissions.data?.length).toBeGreaterThan(0);

    const roles = await db.from("roles").select("key");
    expect(roles.data).toEqual([]);
  });

  it("reports an empty permission list", async () => {
    const { data, error } = await authedClient(nobody.accessToken).rpc(
      "my_permissions",
    );

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});

describe("RBAC — an administrator holds everything", () => {
  it("reports every permission of the catalogue", async () => {
    const catalogue = await serviceClient().from("permissions").select("key");
    const { data } = await authedClient(admin.accessToken).rpc(
      "my_permissions",
    );

    expect(data?.length).toBe(catalogue.data?.length);
  });

  it("holds a permission no role_permissions row grants", async () => {
    // `is_admin` *is* the grant — the seeded role deliberately carries no link
    // rows, so a permission added by a later migration is covered for free.
    const links = await serviceClient()
      .from("role_permissions")
      .select("permission_key")
      .eq("role_id", adminRoleId);
    expect(links.data).toEqual([]);

    const { data } = await authedClient(admin.accessToken).rpc(
      "has_permission",
      { p_key: "boardgames.delete" },
    );
    expect(data).toBe(true);
  });
});

describe("RBAC — the administrator door only closes from the database", () => {
  it("refuses to delete an administrator assignment", async () => {
    const victim = await createTestUser();

    try {
      const del = await authedClient(admin.accessToken)
        .from("user_roles")
        .delete()
        .eq("user_id", victim.id)
        .select("*");
      expect(del.error).toBeNull(); // silent, as every RLS refusal is
      expect(del.data).toEqual([]);

      const still = await serviceClient()
        .from("user_roles")
        .select("user_id")
        .eq("user_id", victim.id);
      expect(still.data?.length).toBe(1);
    } finally {
      await deleteTestUser(victim.id);
    }
  });

  it("refuses to turn the administrator flag off", async () => {
    const { error } = await authedClient(admin.accessToken)
      .from("roles")
      .update({ is_admin: false })
      .eq("id", adminRoleId)
      .select("*");

    expect(error?.code).toBe("42501");
  });

  it("refuses to create a role that is administrator", async () => {
    const { error } = await authedClient(admin.accessToken)
      .from("roles")
      .insert({ key: `evil-${Date.now()}`, label: "Evil", is_admin: true })
      .select("*");

    expect(error?.code).toBe("42501");
  });

  it("refuses to delete the seeded role", async () => {
    const del = await authedClient(admin.accessToken)
      .from("roles")
      .delete()
      .eq("id", adminRoleId)
      .select("*");

    expect(del.error?.code).toBe("23514"); // check_violation, raised by trigger
  });
});

describe("RBAC — a composed role grants exactly what it lists", () => {
  it("opens reading and nothing else", async () => {
    const service = serviceClient();
    const reader = await createTestUser({ admin: false });
    const { data: role } = await service
      .from("roles")
      .insert({ key: `reader-${Date.now()}`, label: "Lecteur" })
      .select("*")
      .single();
    const roleId = role?.id as string;

    try {
      await service
        .from("role_permissions")
        .insert({ role_id: roleId, permission_key: "boardgames.read" });
      await service
        .from("user_roles")
        .insert({ user_id: reader.id, role_id: roleId });

      const db = authedClient(reader.accessToken);

      const read = await db.from("boardgames").select("id");
      expect(read.data?.length).toBeGreaterThan(0);

      const created = await db
        .from("boardgames")
        .insert({ name: `Nope-${Date.now()}` })
        .select("*");
      expect(created.error?.code).toBe("42501");

      const { data: mine } = await db.rpc("my_permissions");
      expect(mine).toEqual(["boardgames.read"]);
    } finally {
      await deleteTestUser(reader.id);
      await service.from("roles").delete().eq("id", roleId);
    }
  });

  it("refuses a billable permission on a role that is not administrator", async () => {
    const service = serviceClient();
    const { data: role } = await service
      .from("roles")
      .insert({ key: `billing-${Date.now()}`, label: "Payant" })
      .select("*")
      .single();
    const roleId = role?.id as string;
    const key = "boardgames.delete";

    try {
      await service
        .from("permissions")
        .update({ billable: true })
        .eq("key", key);

      const { error } = await service
        .from("role_permissions")
        .insert({ role_id: roleId, permission_key: key })
        .select("*");
      expect(error?.code).toBe("23514");
    } finally {
      await service
        .from("permissions")
        .update({ billable: false })
        .eq("key", key);
      await service.from("roles").delete().eq("id", roleId);
    }
  });
});
