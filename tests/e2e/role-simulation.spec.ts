import { expect, test } from "@playwright/test";

import { adminClient } from "./utils/supabase";

/**
 * Looking at the application as a role (full-suite only — untagged).
 *
 * The journey checks two things that are easy to confuse. Starting a
 * simulation lands on the home screen, because the administration screen it
 * was started from is exactly the screen most roles may not read — and the
 * narrowing shows there, as a tile that is gone. That redirection is a
 * courtesy, not the gate: walking straight back to the administration screen
 * is allowed, and the screen is narrowed anyway. Ending it closes the round
 * trip on the Rôles tab it was started from.
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

    // Starting one loads the home screen: every policy now answers
    // differently, and the screen just left is not one this role may read.
    await expect(
      page.getByRole("heading", { name: "Boardmate", level: 1 }),
    ).toBeVisible();

    const banner = page.getByText(/Vue simulée/);
    await expect(banner).toBeVisible();
    await expect(page.getByText(label)).toBeVisible();

    // Home is where the narrowing first shows: the tile leading back to the
    // administration screen is gone.
    await expect(
      page.getByRole("link", { name: "Administration" }),
    ).toHaveCount(0);

    // The narrowing is the database's, not the redirection's, so the screen
    // that started it is narrowed even when walked back to by hand: the two
    // tabs this simulation may no longer read are gone, and the sentence
    // explaining why has taken their place.
    await page.goto("/admin");

    await expect(page.getByRole("button", { name: "Rôles" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Comptes" })).toHaveCount(0);
    await expect(
      page.getByText(/n'a pas la permission « Consulter les rôles »/),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Nouveau rôle" }),
    ).toHaveCount(0);

    // Ending it returns to the Rôles tab it was started from — straight onto
    // the tab, not the catalogue the screen opens on by default.
    await page.getByRole("button", { name: "Quitter" }).click();

    await expect(page).toHaveURL(/\/admin\?onglet=roles$/);
    await expect(page.getByText(/Vue simulée/)).toHaveCount(0);
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
