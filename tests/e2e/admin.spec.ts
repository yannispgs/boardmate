import { expect, test } from "@playwright/test";

import { adminClient } from "./utils/supabase";

/**
 * The administration screen (full-suite only — untagged): the permission
 * catalogue under the owner's section headings, and the roles that hand it out.
 */
test("lists the permission catalogue by section", async ({ page }) => {
  await page.goto("/admin");

  await expect(
    page.getByRole("heading", { name: "Administration" }),
  ).toBeVisible();

  // A section heading, and a permission under it.
  await expect(page.getByText(/Jeux & barèmes · \d+/)).toBeVisible();
  await expect(
    page.getByRole("listitem").filter({ hasText: "boardgames.update" }),
  ).toBeVisible();

  // Every permission names the roles handing it out — here, the seeded one.
  await expect(
    page
      .getByRole("listitem")
      .filter({ hasText: "boardgames.update" })
      .getByText("Administrateur"),
  ).toBeVisible();
});

test("shows a composed role beside the seeded administrator", async ({
  page,
}) => {
  const admin = adminClient();
  const key = `e2e-role-${Date.now().toString(36)}`;
  const { data: role } = await admin
    .from("roles")
    .insert({ key, label: "Lecteur E2E" })
    .select("id")
    .single();
  const roleId = role?.id as string;

  try {
    await admin
      .from("role_permissions")
      .insert({ role_id: roleId, permission_key: "faq.read" });

    await page.goto("/admin");
    await page.getByRole("button", { name: "Rôles" }).click();

    const seeded = page
      .getByRole("listitem")
      .filter({ hasText: "Administrateur" });
    await expect(seeded.getByText(/Toutes les permissions/)).toBeVisible();

    const composed = page
      .getByRole("listitem")
      .filter({ hasText: "Lecteur E2E" })
      .first();
    await expect(composed.getByText("1 permission")).toBeVisible();
  } finally {
    await admin.from("roles").delete().eq("id", roleId);
  }
});

test("the home menu links to Administration", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("link", { name: /Administration/ }),
  ).toBeVisible();
});
