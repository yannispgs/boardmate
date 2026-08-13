import { afterAll, beforeAll, describe, expect, it } from "vitest";

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

    expect((await repo(admin).myPermissions()).length).toBe(catalogue.length);
    expect(await repo(nobody).myPermissions()).toEqual([]);
  });

  it("returns no role at all to an account without `roles.read`", async () => {
    // RLS filters rather than fails, so the adapter hands back an empty list
    // and the screen is the one that has to explain why.
    expect(await repo(nobody).listRoles()).toEqual([]);
    expect((await repo(nobody).listPermissions()).length).toBeGreaterThan(0);
  });
});
