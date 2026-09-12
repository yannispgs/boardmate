import { expect, test } from "@playwright/test";

import { adminClient } from "./utils/supabase";

/**
 * Looking at the application as a role (full-suite only — untagged).
 *
 * The point of the journey is that the narrowing is real: the screen that
 * launched the simulation is itself narrowed by it, and the only thing left on
 * it is the banner's way out.
 */
test("narrows the application to a role, then hands the rights back", async ({
  page,
}) => {
  const admin = adminClient();
  const label = `Observateur ${Date.now().toString(36)}`;
  const { data: role } = await admin
    .from("roles")
    .insert({ key: `observateur-${Date.now().toString(36)}`, label })
    .select("id")
    .single();
  const roleId = role?.id as string;

  try {
    await admin
      .from("role_permissions")
      .insert({ role_id: roleId, permission_key: "games.read" });

    await page.goto("/admin");
    await page.getByRole("button", { name: "Rôles" }).click();

    const panel = page.getByTestId("role-simulation");
    await expect(
      panel.getByRole("heading", { name: /Voir l'application comme/ }),
    ).toBeVisible();

    await panel.getByRole("button", { name: label }).click();
    await panel.getByRole("button", { name: "Lancer la vue simulée" }).click();

    // Starting one reloads the page: every policy now answers differently.
    const banner = page.getByText(/Vue simulée/);
    await expect(banner).toBeVisible();
    await expect(page.getByText(label)).toBeVisible();

    // The narrowing is the database's, so it reaches the very screen that
    // started it — the role list this simulation may no longer read.
    await page.getByRole("button", { name: "Rôles" }).click();
    await expect(
      page.getByText(/n'a pas la permission « Consulter les rôles »/),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Nouveau rôle" }),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "Quitter" }).click();

    await expect(page.getByText(/Vue simulée/)).toHaveCount(0);
    await page.getByRole("button", { name: "Rôles" }).click();
    await expect(
      page.getByRole("button", { name: "Nouveau rôle" }),
    ).toBeVisible();
  } finally {
    // Before the role, and unconditionally: a view left running would follow
    // the shared session into every scenario that comes after this one.
    await admin
      .from("permission_simulations")
      .delete()
      .not("user_id", "is", null);
    await admin.from("roles").delete().eq("id", roleId);
  }
});
