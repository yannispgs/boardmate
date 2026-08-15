import { expect, test } from "@playwright/test";

import { adminClient } from "./utils/supabase";

/**
 * The administration screen (full-suite only — untagged): the permission
 * catalogue under the owner's section headings, and the roles that hand it out.
 */
test("lists the permission catalogue by section", async ({ page }) => {
  await page.goto("/admin");

  // Level 1, because « Administration » is also one of the sections below.
  await expect(
    page.getByRole("heading", { name: "Administration", level: 1 }),
  ).toBeVisible();

  // A section heading, and a permission under it.
  await expect(page.getByText(/Jeux & barèmes · \d+/)).toBeVisible();

  const row = page
    .getByRole("listitem")
    .filter({ hasText: "boardgames.updateScoring" });
  await expect(row).toBeVisible();

  // The line is the key and its CRUD family; the sentence lives in the bubble.
  await expect(row.getByText("update", { exact: true })).toBeVisible();
  await row.getByRole("button", { name: "boardgames.updateScoring" }).click();
  await expect(page.getByTestId("info-bubble")).toContainText("barème");
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

    // The administrator card carries its name, its badge and nothing else: it
    // holds every permission, and neither the role nor what it grants can be
    // acted upon from here.
    const seeded = page
      .getByRole("listitem")
      .filter({ hasText: "Administrateur" });
    await expect(seeded.getByText(/Permissions/)).toHaveCount(0);
    await expect(
      seeded.getByRole("button", { name: /^Supprimer/ }),
    ).toHaveCount(0);

    const composed = page
      .getByRole("listitem")
      .filter({ hasText: "Lecteur E2E" })
      .first();
    await expect(composed.getByText("Permissions (1)")).toBeVisible();

    // The roles tab is where a permission's holders are named, so the keys are
    // listed here and nowhere else — one tap into the disclosure that keeps a
    // card readable when a role hands out thirty of them.
    await composed.getByText("Permissions (1)").click();
    await expect(composed.getByText("faq.read")).toBeVisible();
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
