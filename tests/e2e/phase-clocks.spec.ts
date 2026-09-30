import { expect, test } from "@playwright/test";

import { adminClient, seedBoardgame } from "./utils/supabase";

/**
 * « Phases de la manche » in a game's settings (full-suite only — untagged).
 *
 * The phases are the rulebook's and read-only; the clock of each is the one
 * thing a table may change. The journey saves a change, reads it back after a
 * reload, and checks in the database that the draft block — which the drawer
 * never shows — is still there: rebuilding the phases from what the screen
 * shows would silently drop it.
 */
test("changes a phase's clock and keeps what the drawer does not show", async ({
  page,
}) => {
  const admin = adminClient();
  const stamp = Date.now().toString(36);
  const ids: string[] = [];

  try {
    const phased = await seedBoardgame(admin, {
      name: `E2E Phases ${stamp}`,
      phases: [
        {
          key: "research",
          label: "Découverte",
          mode: "simultaneous",
          clock: "stopwatch",
          draft: { configKey: "draft", oddStage: "right" },
        },
        {
          key: "action",
          label: "Projets",
          mode: "sequential",
          clock: "turnTimer",
        },
      ],
    });
    const plain = await seedBoardgame(admin, { name: `E2E Sans ${stamp}` });

    ids.push(phased, plain);

    await page.goto(`/boardgames/${phased}/edit`);

    const drawer = page.getByTestId("phase-clocks");

    await expect(drawer).toContainText("1. Découverte");
    await expect(drawer).toContainText("Tous en même temps");
    await expect(drawer).toContainText("2. Projets");
    await expect(drawer).toContainText("Tour par tour");

    const research = drawer.getByLabel("Horloge de la phase Découverte");
    const action = drawer.getByLabel("Horloge de la phase Projets");

    // Nobody has « their turn » in a phase played all at once.
    await expect(research.locator("option")).toHaveText([
      "Chronomètre de table",
      "Aucune",
    ]);
    await expect(action.locator("option")).toHaveText([
      "Minuteur par joueur",
      "Chronomètre de table",
      "Aucune",
    ]);

    const save = drawer.getByRole("button", {
      name: "Enregistrer les horloges",
    });

    await expect(save).toBeDisabled();

    await research.selectOption({ label: "Aucune" });
    await save.click();

    await expect(drawer.getByText("Enregistré")).toBeVisible();

    await page.reload();

    await expect(
      page
        .getByTestId("phase-clocks")
        .getByLabel("Horloge de la phase Découverte"),
    ).toHaveValue("none");

    const { data } = await admin
      .from("boardgames")
      .select("phases")
      .eq("id", phased)
      .single();
    const stored = data?.phases as Array<Record<string, unknown>>;

    expect(stored[0].clock).toBe("none");
    expect(stored[0].draft).toEqual({ configKey: "draft", oddStage: "right" });
    expect(stored[1].clock).toBe("turnTimer");

    // A game without phases has no drawer at all.
    await page.goto(`/boardgames/${plain}/edit`);

    await expect(
      page.getByRole("heading", { name: "Informations du jeu" }),
    ).toBeVisible();
    await expect(page.getByTestId("phase-clocks")).toHaveCount(0);
  } finally {
    await admin.from("boardgames").delete().in("id", ids);
  }
});
