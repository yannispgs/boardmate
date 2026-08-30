import { expect, test } from "@playwright/test";

import { adminClient } from "./utils/supabase";

/**
 * Boardgame management (exhaustive, full-suite only — untagged). Covers the CRUD
 * lifecycle, the deactivate/reactivate flow, and the three logo sources.
 */

/** 1×1 transparent PNG, fed to the file picker without a fixture on disk. */
const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

test("creates, edits and deletes a boardgame", async ({ page }) => {
  const name = `E2E Jeu ${Date.now().toString(36)}`;
  const renamed = `${name} v2`;

  await page.goto("/boardgames");

  // Adding a game is now a dedicated page, not an inline panel.
  await page.getByRole("link", { name: "+ Ajouter un jeu" }).click();
  await expect(page).toHaveURL(/\/boardgames\/new$/);
  await page.getByLabel("Nom du jeu").fill(name);
  await page.getByLabel("Joueurs min").fill("2");
  await page.getByLabel("Joueurs max").fill("5");
  await page.getByLabel("Conseillé min").fill("3");
  await page.getByLabel("Conseillé max").fill("4");
  await page.getByLabel("Durée moyenne (min)").fill("45");
  await page.getByLabel("Nombre de tours (vide = illimité)").fill("20");
  await page.getByLabel("Tags (séparés par des virgules)").fill("famille, dés");
  await page.getByRole("button", { name: "Ajouter" }).click();

  await expect(page.getByText(name, { exact: true })).toBeVisible();

  // The row itself opens the game, on its first tab: the game's own name titles
  // the page, and the round limit round-trips into the form under it.
  await page.getByRole("link", { name, exact: true }).click();
  await expect(page).toHaveURL(/\/boardgames\/[0-9a-f-]+\/edit$/);
  await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
  await expect(
    page.getByLabel("Nombre de tours (vide = illimité)"),
  ).toHaveValue("20");
  await page.getByLabel("Nom du jeu").fill(renamed);
  // Saving stays on the settings page (it's the game's hub) and confirms.
  // The tick is part of the match: « Enregistré » alone is a case-insensitive
  // substring of the danger zone's « une partie y est enregistrée », which sits
  // on this same page — the assertion would pass before the save even started.
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.getByText("Enregistré ✓")).toBeVisible();

  // Back to the list to see the rename.
  await page.getByRole("link", { name: "← Jeux" }).click();
  await expect(page.getByText(renamed, { exact: true })).toBeVisible();
  await expect(page.getByText(name, { exact: true })).toHaveCount(0);

  // Deleting is no longer a small red target on a row: it waits at the foot of
  // the game's own settings, where you went on purpose.
  await page.getByRole("link", { name: renamed, exact: true }).click();
  await page.getByRole("button", { name: `Supprimer ${renamed}` }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Supprimer" }).click();

  // Deleting the game you were looking at leaves you where it used to be.
  await expect(page).toHaveURL(/\/boardgames$/);
  await expect(page.getByText(renamed, { exact: true })).toHaveCount(0);
});

test("edits a boardgame's scoring type", async ({ page }) => {
  const name = `E2E Score ${Date.now().toString(36)}`;

  try {
    await page.goto("/boardgames");
    await page.getByRole("link", { name: "+ Ajouter un jeu" }).click();
    await page.getByLabel("Nom du jeu").fill(name);

    // Scoring (lowest wins), simultaneous mode, coop kind, 2×d6 dice tracking.
    await page.getByLabel("Ce jeu se joue avec des points").check();

    // The tip describing the accepted values sits inside the field's own
    // `label`, where a click normally lands on the select: reading it must
    // open the bubble and leave the field untouched.
    await page
      .getByRole("button", { name: "Compétitif, coopératif ou hybride" })
      .click();
    await expect(page.getByText("se déroule comme un jeu")).toBeVisible();
    await expect(page.getByLabel("Type de jeu")).toHaveValue("competitive");

    await page.getByLabel("Condition de victoire").selectOption("lowest");
    await page.getByLabel("Mode de jeu").selectOption("simultaneous");
    await page.getByLabel("Type de jeu").selectOption("cooperative");
    await page.getByLabel("Suivre les lancers de dés").check();
    await page.getByLabel("Nombre de dés").fill("2");
    await page.getByLabel("Faces par dé").fill("6");
    await page.getByRole("button", { name: "Ajouter" }).click();
    await expect(page.getByText(name, { exact: true })).toBeVisible();

    // Re-open the edit form: all of it round-trips.
    await page.getByRole("link", { name, exact: true }).click();
    await expect(
      page.getByLabel("Ce jeu se joue avec des points"),
    ).toBeChecked();
    await expect(page.getByLabel("Condition de victoire")).toHaveValue(
      "lowest",
    );
    await expect(page.getByLabel("Mode de jeu")).toHaveValue("simultaneous");
    await expect(page.getByLabel("Type de jeu")).toHaveValue("cooperative");
    await expect(page.getByLabel("Suivre les lancers de dés")).toBeChecked();
    await expect(page.getByLabel("Nombre de dés")).toHaveValue("2");
    await expect(page.getByLabel("Faces par dé")).toHaveValue("6");
  } finally {
    await adminClient().from("boardgames").delete().eq("name", name);
  }
});

test("builds a category scoresheet from the edit form", async ({ page }) => {
  const name = `E2E Cat ${Date.now().toString(36)}`;

  try {
    await page.goto("/boardgames");
    await page.getByRole("link", { name: "+ Ajouter un jeu" }).click();
    await page.getByLabel("Nom du jeu").fill(name);

    // Scored, tallied by categories: a section with a field + a standalone one.
    await page.getByLabel("Ce jeu se joue avec des points").check();
    await page.getByLabel("Décompte des points").selectOption("categories");

    // The category sheet is collapsed by default — open it to edit it.
    await page.getByText("Détail des catégories", { exact: true }).click();
    await page.getByRole("button", { name: "+ Section" }).click();
    await page.getByPlaceholder("Nom de la section").fill("Animaux");
    await page.getByRole("button", { name: "+ Champ dans la section" }).click();
    await page.getByPlaceholder("Nom du champ").first().fill("Ours");

    await page.getByRole("button", { name: "+ Champ", exact: true }).click();
    await page.getByPlaceholder("Nom du champ").last().fill("Bonus");

    await page.getByRole("button", { name: "Ajouter" }).click();
    await expect(page.getByText(name, { exact: true })).toBeVisible();

    // Re-open: the whole sheet round-trips into the editor.
    await page.getByRole("link", { name, exact: true }).click();
    await expect(page.getByLabel("Décompte des points")).toHaveValue(
      "categories",
    );
    // Expand the collapsed category sheet to inspect it.
    await page.getByText("Détail des catégories", { exact: true }).click();
    await expect(page.getByPlaceholder("Nom de la section")).toHaveValue(
      "Animaux",
    );
    const fields = page.getByPlaceholder("Nom du champ");
    await expect(fields.nth(0)).toHaveValue("Ours");
    await expect(fields.nth(1)).toHaveValue("Bonus");
  } finally {
    await adminClient().from("boardgames").delete().eq("name", name);
  }
});

test("creates a game with no clock and its own tie-break rule", async ({
  page,
}) => {
  const name = `E2E Sans chrono ${Date.now().toString(36)}`;
  const admin = adminClient();

  try {
    await page.goto("/boardgames");
    await page.getByRole("link", { name: "+ Ajouter un jeu" }).click();
    await page.getByLabel("Nom du jeu").fill(name);

    // A game whose turns go by too fast to time (Papayoo, Duck & Cover): the
    // clock used to be a migration's business, so a game added here was timed
    // whether it made sense or not.
    await page.getByLabel("Chronométrer les tours").uncheck();

    await page.getByLabel("Ce jeu se joue avec des points").check();
    await page.getByLabel("Condition de victoire").selectOption("lowest");

    await page.getByText("Départage des égalités").click();

    // The tip explaining the order sits in the summary, where a click normally
    // closes the drawer: reading it must not hide what it explains.
    await page.getByRole("button", { name: "Ordre des règles" }).click();
    await expect(page.getByText("Les règles sont essayées")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "+ Règle de départage" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "+ Règle de départage" }).click();
    await page
      .getByLabel("Nom de la règle")
      .fill("Le moins de cartes révélées");
    await page.getByLabel("Qui l'emporte").selectOption("lowest");
    await page
      .getByLabel("Aide affichée à la saisie (facultatif)")
      .fill("Cartes révélées devant chaque joueur");

    await page.getByRole("button", { name: "Ajouter" }).click();
    await expect(page.getByText(name, { exact: true })).toBeVisible();

    // What actually reached the database — the whole point of the change.
    const { data: saved } = await admin
      .from("boardgames")
      .select("is_timed, scoring")
      .eq("name", name)
      .single();

    expect(saved?.is_timed).toBe(false);
    expect((saved?.scoring as { tieBreak: unknown[] }).tieBreak).toEqual([
      {
        key: expect.any(String),
        label: "Le moins de cartes révélées",
        direction: "lowest",
        source: "ask",
        help: "Cartes révélées devant chaque joueur",
      },
    ]);

    // Re-open the settings: both round-trip into the form.
    await page.getByRole("link", { name, exact: true }).click();
    await expect(page.getByLabel("Chronométrer les tours")).not.toBeChecked();
    await page.getByText("Départage des égalités").click();
    await expect(page.getByLabel("Nom de la règle")).toHaveValue(
      "Le moins de cartes révélées",
    );
    await expect(page.getByLabel("Qui l'emporte")).toHaveValue("lowest");

    // Deleting the last rule leaves no empty list behind: a game with no rule
    // shares the victory, which is not the same thing as a rule that fits
    // nobody.
    await page.getByRole("button", { name: "Supprimer la règle" }).click();

    // Checked before saving: were the form ever put back the way the database
    // still holds it, the save below would write the rule again and the failure
    // would land on the row, three lines away from what actually went wrong.
    await expect(page.getByLabel("Nom de la règle")).toBeHidden();

    await page
      .getByRole("button", { name: "Enregistrer", exact: true })
      .click();
    // The tick matters here more than anywhere: this is the only thing standing
    // between the click and the row read below, and « Enregistré » alone
    // already matches the danger zone's static text on this page — so the read
    // used to race a write nothing had waited for.
    await expect(page.getByText("Enregistré ✓")).toBeVisible();

    const { data: cleared } = await admin
      .from("boardgames")
      .select("scoring")
      .eq("name", name)
      .single();

    expect(cleared?.scoring).not.toHaveProperty("tieBreak");
  } finally {
    await admin.from("boardgames").delete().eq("name", name);
  }
});

test("deactivates then reactivates a boardgame", async ({ page }) => {
  const name = `E2E Off ${Date.now().toString(36)}`;

  try {
    await page.goto("/boardgames");
    await page.getByRole("link", { name: "+ Ajouter un jeu" }).click();
    await page.getByLabel("Nom du jeu").fill(name);
    await page.getByRole("button", { name: "Ajouter" }).click();
    await expect(page.getByText(name, { exact: true })).toBeVisible();

    // Never played → deactivation is immediate (no confirmation).
    await page.getByRole("button", { name: `Désactiver ${name}` }).click();

    // It now sits behind the collapsed "Désactivés" disclosure.
    const reactivate = page.getByRole("button", { name: `Réactiver ${name}` });
    await expect(reactivate).toBeHidden();
    await page.getByText(/Désactivés ·/).click();
    await expect(reactivate).toBeVisible();

    await reactivate.click();
    await expect(
      page.getByRole("button", { name: `Désactiver ${name}` }),
    ).toBeVisible();
  } finally {
    await adminClient().from("boardgames").delete().eq("name", name);
  }
});

test("offers three logo sources and uploads a file", async ({ page }) => {
  await page.goto("/boardgames");
  await page.getByRole("link", { name: "+ Ajouter un jeu" }).click();

  // File is the default source: its picker is shown.
  await expect(
    page.getByRole("button", { name: "URL", exact: true }),
  ).toBeVisible();

  // URL source → the URL input appears.
  await page.getByRole("button", { name: "URL", exact: true }).click();
  await expect(page.getByLabel("URL du logo (PNG ou JPEG)")).toBeVisible();

  // Paste source → the paste zone appears.
  await page.getByRole("button", { name: "Coller", exact: true }).click();
  await expect(page.getByLabel("Zone de collage du logo")).toBeVisible();

  // Back to File → upload a PNG and see the preview.
  await page.getByRole("button", { name: "Fichier", exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "logo.png",
    mimeType: "image/png",
    buffer: PNG_1PX,
  });
  await expect(page.getByRole("img", { name: "Logo" })).toBeVisible();

  await page.getByRole("button", { name: "Annuler" }).click();
});

test("edits a boardgame with a logo without touching it", async ({ page }) => {
  const admin = adminClient();
  const name = `Logo-${Date.now().toString(36)}`;
  let id = "";

  try {
    const { data } = await admin
      .from("boardgames")
      .insert({
        name,
        min_players: 2,
        max_players: 4,
        logo_url: "https://cdn.example.com/stored-logo.png",
      })
      .select("id")
      .single();
    id = data?.id as string;

    await page.goto(`/boardgames/${id}/edit`);

    // The existing logo shows as a preview + a "Modifier le logo" button — it is
    // NOT loaded into the URL picker (whose re-validation would fail on save).
    await expect(
      page.getByRole("button", { name: "Modifier le logo" }),
    ).toBeVisible();
    await expect(page.getByRole("img", { name: "Logo" })).toBeVisible();
    await expect(page.getByLabel("URL du logo (PNG ou JPEG)")).toHaveCount(0);

    // Saving without touching the logo succeeds — no validation error.
    await page
      .getByRole("button", { name: "Enregistrer", exact: true })
      .click();
    // Read the page's own alerts rather than its prose: the settings now end on
    // a deletion block that says out loud what deleting a played game makes
    // impossible, and a word-match would take that for a failure. Scoped to
    // `main` because Next's route announcer is an empty alert of its own,
    // outside it, on every page.
    await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);

    // Clicking "modifier" reveals the picker (and a way to cancel back).
    await page.getByRole("button", { name: "Modifier le logo" }).click();
    await expect(
      page.getByRole("button", { name: "Fichier", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Annuler la modification du logo" })
      .click();
    await expect(
      page.getByRole("button", { name: "Modifier le logo" }),
    ).toBeVisible();
  } finally {
    if (id) {
      await admin.from("boardgames").delete().eq("id", id);
    }
  }
});
