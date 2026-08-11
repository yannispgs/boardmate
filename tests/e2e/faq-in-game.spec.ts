import { expect, test } from "@playwright/test";

import { funnelToPlay } from "./utils/funnel";
import {
  adminClient,
  CATAN_MIN_PLAYERS,
  CATAN_NAME,
  deleteFaqEntries,
  seedFaqEntries,
  seedPlayers,
} from "./utils/supabase";

const GAME_QUESTION = "E2E Peut-on garder plus de 7 cartes ?";
const OTHER_QUESTION = "E2E Comment poser un port ?";
const APP_QUESTION = "E2E Comment installer Boardmate ?";

/**
 * The FAQ read during a game (full-suite only — untagged): the corner button
 * opens the rules of the game on the table and of nothing else, a word narrows
 * them down, and closing the panel forgets what was typed.
 */
test("reads, searches and closes the FAQ during a game", async ({ page }) => {
  const players = await seedPlayers(CATAN_MIN_PLAYERS);
  const questions = await seedFaqEntries([
    {
      question: GAME_QUESTION,
      answer: "Non, on défausse la moitié.",
      scope: "catan",
    },
    {
      question: OTHER_QUESTION,
      answer: "Sur une arête côtière.",
      scope: "catan",
    },
    { question: APP_QUESTION, answer: "Depuis le navigateur.", scope: "app" },
  ]);
  let gameId = "";

  try {
    gameId = await funnelToPlay(page, players);

    await page.getByRole("button", { name: "Ouvrir la FAQ" }).click();

    const panel = page.getByRole("dialog", { name: "FAQ" });

    await expect(panel).toBeVisible();
    // The game's own questions, under its name — and not the app's, which
    // belong to the FAQ screen, not to the table.
    await expect(
      panel.getByRole("heading", { name: CATAN_NAME, exact: true }),
    ).toBeVisible();
    await expect(panel.getByText(GAME_QUESTION)).toBeVisible();
    await expect(panel.getByText(OTHER_QUESTION)).toBeVisible();
    await expect(panel.getByText(APP_QUESTION)).toHaveCount(0);

    // A word of the question is enough to be left with that one question.
    await panel
      .getByPlaceholder("Un mot de la question ou de la réponse")
      .fill("port");

    await expect(panel.getByText(OTHER_QUESTION)).toBeVisible();
    await expect(panel.getByText(GAME_QUESTION)).toHaveCount(0);

    // The answer is folded away until the question is asked.
    await expect(panel.getByText("Sur une arête côtière.")).toBeHidden();
    await panel.getByText(OTHER_QUESTION).click();
    await expect(panel.getByText("Sur une arête côtière.")).toBeVisible();

    // A word nobody wrote about says so rather than showing an empty list.
    await panel
      .getByPlaceholder("Un mot de la question ou de la réponse")
      .fill("dragon");

    await expect(
      panel.getByText(/Aucune question ne correspond/),
    ).toBeVisible();

    await panel.getByRole("button", { name: "Fermer" }).click();

    await expect(page.getByRole("dialog", { name: "FAQ" })).toHaveCount(0);

    // Reopening starts on a clean search: the next question is a new one.
    await page.getByRole("button", { name: "Ouvrir la FAQ" }).click();

    const reopened = page.getByRole("dialog", { name: "FAQ" });

    await expect(reopened.getByText(GAME_QUESTION)).toBeVisible();
    await expect(reopened.getByText(OTHER_QUESTION)).toBeVisible();
  } finally {
    const admin = adminClient();
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }
    await admin.from("players").delete().in("name", players);
    await deleteFaqEntries(questions);
  }
});

/**
 * Writing a question down without leaving the table (full-suite only): the
 * corner « + » opens the form, and what it saves is in the list straight away —
 * even when the search that was running would have hidden it.
 */
test("writes a new question from the game's FAQ panel", async ({ page }) => {
  const players = await seedPlayers(CATAN_MIN_PLAYERS);
  const asked = "E2E Combien de chevaliers pour l'armée ?";
  let gameId = "";

  try {
    gameId = await funnelToPlay(page, players);

    await page.getByRole("button", { name: "Ouvrir la FAQ" }).click();

    const panel = page.getByRole("dialog", { name: "FAQ" });

    // A search left running is no reason to lose the answer just written.
    await panel
      .getByPlaceholder("Un mot de la question ou de la réponse")
      .fill("dragon");

    await panel.getByRole("button", { name: "Ajouter une question" }).click();

    // With no extension on the table there is one section, so nothing is asked.
    await expect(
      panel.getByRole("heading", { name: `Nouvelle question · ${CATAN_NAME}` }),
    ).toBeVisible();

    await panel.getByLabel("Question").fill(asked);
    await panel.getByLabel("Réponse").fill("Trois.");
    await panel.getByRole("button", { name: "Ajouter" }).click();

    await expect(panel.getByText(asked)).toBeVisible();

    // It went to the database, not just to the screen: reopening finds it.
    await panel.getByRole("button", { name: "Fermer" }).click();
    await page.getByRole("button", { name: "Ouvrir la FAQ" }).click();

    await expect(
      page.getByRole("dialog", { name: "FAQ" }).getByText(asked),
    ).toBeVisible();
  } finally {
    const admin = adminClient();
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }
    await admin.from("players").delete().in("name", players);
    await deleteFaqEntries([asked]);
  }
});
