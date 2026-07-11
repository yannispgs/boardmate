import { expect, test } from "@playwright/test";

import { adminClient, CATAN_NAME, seedPlayers } from "./utils/supabase";

/**
 * The optional "wheel of fortune" that elects the first player at the recap step
 * (full-suite only — untagged). Emulating reduced motion makes the wheel settle
 * instantly, so the test is deterministic without waiting on the spin animation.
 * The winner is random, so we read who it landed on and assert the turn order
 * rotates to lead with them.
 */
test("spins the wheel to elect the first player and rotates the order", async ({
  page,
}) => {
  const players = await seedPlayers(3);

  try {
    // Reduced motion → the wheel jumps straight to its result.
    await page.emulateMedia({ reducedMotion: "reduce" });

    await page.goto("/games/new");
    await page.getByRole("button", { name: CATAN_NAME, exact: true }).click();
    await page
      .getByRole("button", { name: "Sans configuration", exact: true })
      .click();
    for (const name of players) {
      await page.getByRole("button", { name, exact: true }).click();
    }
    await page.getByRole("button", { name: "Continuer →" }).click();

    // The recap starts with the selected order (player 0 leads).
    await expect(
      page.getByText(new RegExp(`Premier joueur · ${players[0]}`)),
    ).toBeVisible();

    // Open the wheel and spin it.
    await page.getByRole("button", { name: "🎡 Tirer au sort" }).click();
    const wheel = page.getByRole("dialog", { name: "Roue du premier joueur" });
    await expect(wheel).toBeVisible();
    await wheel.getByRole("button", { name: "Tourner la roue" }).click();

    // It settles on a random winner; read them off the confirm button.
    const confirm = wheel.getByRole("button", { name: /commence$/ });
    await expect(confirm).toBeVisible();
    const label = (await confirm.textContent()) ?? "";
    const winner = label.replace(/\s*commence$/, "").trim();

    expect(players).toContain(winner);

    // Confirming closes the wheel and rotates the turn order to lead with them.
    await confirm.click();
    await expect(wheel).toBeHidden();
    await expect(
      page.getByText(new RegExp(`Premier joueur · ${winner}`)),
    ).toBeVisible();
    await expect(page.getByText(new RegExp(`1\\. ${winner}`))).toBeVisible();
  } finally {
    await adminClient().from("players").delete().in("name", players);
  }
});
