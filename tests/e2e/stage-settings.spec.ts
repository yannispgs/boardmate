import { expect, test } from "@playwright/test";

import { adminClient, dropSeeded, seedBoardgame } from "./utils/supabase";

/**
 * « Manches » in a game's settings (full-suite only, untagged): a game whose
 * rules fix the number of manches gets its name and its count edited, and
 * keeps the rest of its rules; a calendar only gets renamed.
 */
const BET = { win: 10, hedgedWin: 5, missPerTrick: 5, tricks: 10 };

test("renames a game's manches and changes how many it lasts", async ({
  page,
}) => {
  const admin = adminClient();
  let bgId: string | null = null;

  try {
    bgId = await seedBoardgame(admin, {
      name: `E2E Donnes ${Date.now().toString(36)}`,
      stages: {
        label: "Donne",
        advance: "manual",
        count: 4,
        bet: { ...BET, hedgeLabel: "Jeton" },
      },
    });

    await page.goto(`/boardgames/${bgId}/edit`);

    const section = page.getByTestId("stage-settings");

    await expect(section.getByLabel("Nombre de donnes")).toHaveValue("4");

    await section.getByLabel("Nom d'une manche").fill("Levée");
    await section.getByLabel("Nombre de levées").fill("3");
    await section
      .getByRole("button", { name: "Enregistrer les manches" })
      .click();
    await expect(section.getByText("Enregistré")).toBeVisible();

    await expect
      .poll(async () => {
        const { data } = await admin
          .from("boardgames")
          .select("stages")
          .eq("id", bgId as string)
          .single();

        return data?.stages;
      })
      .toEqual({
        label: "Levée",
        advance: "manual",
        count: 3,
        bet: { ...BET, hedgeLabel: "Jeton" },
      });
  } finally {
    await dropSeeded(admin, { boardgames: [bgId] });
  }
});

test("shows a calendar's length without offering to change it", async ({
  page,
}) => {
  const admin = adminClient();
  let bgId: string | null = null;

  try {
    bgId = await seedBoardgame(admin, {
      name: `E2E Calendrier ${Date.now().toString(36)}`,
      stages: { label: "Manche", advance: "schedule", schedule: [8, 7, 6, 5] },
    });

    await page.goto(`/boardgames/${bgId}/edit`);

    const section = page.getByTestId("stage-settings");

    await expect(
      section.getByText(/^4 manches, de 8, 7, 6, 5 tours/),
    ).toBeVisible();
    await expect(section.getByRole("spinbutton")).toHaveCount(0);
  } finally {
    await dropSeeded(admin, { boardgames: [bgId] });
  }
});
