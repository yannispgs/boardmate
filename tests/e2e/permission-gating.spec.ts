import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { adminClient } from "./utils/supabase";

/**
 * Runs `act`, which starts or stops a simulation, and comes back once the full
 * reload it fires has replaced the document.
 *
 * Marking the current document and waiting for the mark to be gone is the
 * readiness condition, because what the page *shows* cannot tell the two
 * documents apart: while the reload is committing there is briefly nothing on
 * screen, which satisfies « the banner is gone » exactly as the reloaded page
 * does — and the navigation that follows is then aborted by the reload still
 * landing.
 */
async function reloading(page: Page, act: () => Promise<void>) {
  await page.evaluate(() => {
    document.documentElement.dataset.beforeReload = "1";
  });

  await act();

  await expect(page.locator("html:not([data-before-reload])")).toHaveCount(1);
}

/**
 * The interface offers only what the account may do (full-suite only —
 * untagged).
 *
 * Read through a simulated role, which is the one way to be somebody narrower
 * without a second account: the role below may read every screen and write
 * nothing, so every control on them has to be gone. The database would have
 * refused each of these writes anyway — what is asserted here is that the
 * reader is no longer invited to attempt them.
 */
test("withholds the controls the account has no permission for", async ({
  page,
}) => {
  const admin = adminClient();
  const suffix = Date.now().toString(36);
  const label = `Lecteur ${suffix}`;
  const player = `Gate ${suffix}`;

  const { data: role } = await admin
    .from("roles")
    .insert({ key: `lecteur-${suffix}`, label })
    .select("id")
    .single();
  const roleId = role?.id as string;

  const { data: seeded } = await admin
    .from("players")
    .insert({ name: player })
    .select("id")
    .single();
  const playerId = seeded?.id as string;

  try {
    // Reading rights only, deliberately: `roles.read` is in there so the panel
    // that starts the simulation survives it, and nothing else writes.
    await admin
      .from("role_permissions")
      .insert(
        [
          "players.read",
          "boardgames.read",
          "games.read",
          "faq.read",
          "feedback.read",
          "roles.read",
        ].map(key => ({ role_id: roleId, permission_key: key })),
      );

    await page.goto("/admin");
    await page.getByRole("button", { name: "Rôles" }).click();

    const panel = page.getByTestId("role-simulation");
    await panel.getByRole("button", { name: label }).click();
    await reloading(page, () =>
      panel.getByRole("button", { name: "Lancer la vue simulée" }).click(),
    );

    await expect(page.getByText(/Vue simulée/)).toBeVisible();

    // Players: the row keeps the name and loses both controls, and the bar at
    // the bottom no longer offers to add one.
    await page.goto("/players");
    await expect(page.getByText(player)).toBeVisible();

    await expect(
      page.getByRole("button", { name: `Désactiver ${player}` }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: `Supprimer ${player}` }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "+ Ajouter un joueur" }),
    ).toHaveCount(0);

    // Boardgames and parties: the lists are readable, the ways to write are not.
    await page.goto("/boardgames");
    await expect(
      page.getByRole("link", { name: "+ Ajouter un jeu" }),
    ).toHaveCount(0);

    await page.goto("/games");
    await expect(
      page.getByRole("link", { name: "+ Nouvelle partie" }),
    ).toHaveCount(0);

    // Feedback: the box is still readable without the form to file into it.
    await page.goto("/feedback");
    await expect(page.getByRole("button", { name: "Envoyer" })).toHaveCount(0);

    // Back to being oneself, and the controls come back with the rights.
    await reloading(page, () =>
      page.getByRole("button", { name: "Quitter" }).click(),
    );

    await expect(page.getByText(/Vue simulée/)).toHaveCount(0);

    await page.goto("/players");
    await expect(
      page.getByRole("button", { name: `Désactiver ${player}` }),
    ).toBeVisible();
  } finally {
    // Before the role, and unconditionally: a view left running would follow
    // the shared session into every scenario that comes after this one.
    await admin
      .from("permission_simulations")
      .delete()
      .not("user_id", "is", null);
    await admin.from("players").delete().eq("id", playerId);
    await admin.from("roles").delete().eq("id", roleId);
  }
});
