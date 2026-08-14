import { expect, type Page, test } from "@playwright/test";

import { adminClient } from "./utils/supabase";

/**
 * Composing a role from the administration screen (full-suite only —
 * untagged): ticking the permissions it hands out, reading back what changed
 * before it is written, and the one deletion the app refuses.
 */

/** Opens the roles tab, where every role in this file is composed. */
async function openRoles(page: Page) {
  await page.goto("/admin");
  await page.getByRole("button", { name: "Rôles" }).click();
}

/** The confirmation that shows what is about to change, before it is written. */
function recap(page: Page, heading: RegExp) {
  return page.getByRole("dialog").filter({ hasText: heading });
}

function card(page: Page, label: string) {
  return page.getByRole("listitem").filter({ hasText: label }).first();
}

test("composes a role, reads the change back, then edits and deletes it", async ({
  page,
}) => {
  const label = `Composeur ${Date.now().toString(36)}`;
  const renamed = `${label} v2`;

  try {
    await openRoles(page);
    await page.getByRole("button", { name: "Nouveau rôle" }).click();

    const editor = page.getByRole("dialog", { name: "Nouveau rôle" });
    await editor.getByLabel("Nom du rôle").fill(label);
    await editor
      .getByRole("checkbox", { name: "faq.read", exact: true })
      .check();

    // Nothing is written on a tick: the recap is what saves.
    await editor.getByRole("button", { name: "Enregistrer" }).click();

    const creation = recap(page, /Créer le rôle/);
    await expect(creation).toContainText("1 permission ajoutée");
    await expect(creation).toContainText("faq.read");
    await creation.getByRole("button", { name: "Enregistrer" }).click();

    const composed = card(page, label);
    await expect(composed.getByText("1 permission")).toBeVisible();
    await expect(composed.getByText("faq.read")).toBeVisible();

    // Editing: renaming and swapping one permission for another, which the
    // recap has to state as one gain and one loss.
    await composed.getByRole("button", { name: `Modifier ${label}` }).click();

    const editing = page.getByRole("dialog", { name: "Modifier le rôle" });
    await editing.getByLabel("Nom du rôle").fill(renamed);
    await editing
      .getByRole("checkbox", { name: "faq.read", exact: true })
      .uncheck();
    await editing
      .getByRole("checkbox", { name: "games.read", exact: true })
      .check();
    await editing.getByRole("button", { name: "Enregistrer" }).click();

    const change = recap(page, /Enregistrer les modifications/);
    await expect(change).toContainText("1 permission ajoutée");
    await expect(change).toContainText("games.read");
    await expect(change).toContainText("1 permission retirée");
    await expect(change).toContainText("faq.read");
    await change.getByRole("button", { name: "Enregistrer" }).click();

    const edited = card(page, renamed);
    await expect(edited.getByText("games.read")).toBeVisible();
    await expect(edited.getByText("faq.read")).toHaveCount(0);

    await edited.getByRole("button", { name: `Supprimer ${renamed}` }).click();

    const deletion = recap(page, /Supprimer le rôle/);
    await deletion.getByRole("button", { name: "Supprimer" }).click();

    await expect(page.getByText(renamed)).toHaveCount(0);
  } finally {
    await adminClient().from("roles").delete().in("label", [label, renamed]);
  }
});

test("refuses to delete a role somebody wears, and says by how many", async ({
  page,
}) => {
  const admin = adminClient();
  const label = `Porté ${Date.now().toString(36)}`;
  const email = `wearer_${Date.now()}@example.com`;
  const { data: role } = await admin
    .from("roles")
    .insert({ key: `porte-${Date.now().toString(36)}`, label })
    .select("id")
    .single();
  const roleId = role?.id as string;
  const { data: created } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  const wearerId = created?.user?.id as string;

  try {
    await admin
      .from("user_roles")
      .insert({ user_id: wearerId, role_id: roleId });

    await openRoles(page);

    const worn = card(page, label);
    await expect(worn.getByText(/Attribué à 1 compte/)).toBeVisible();
    await expect(
      worn.getByRole("button", { name: `Supprimer ${label}` }),
    ).toBeDisabled();

    // Only the deletion is barred: what the role hands out stays editable, or
    // adjusting it would mean unassigning everybody first.
    await expect(
      worn.getByRole("button", { name: `Modifier ${label}` }),
    ).toBeEnabled();
  } finally {
    await admin.auth.admin.deleteUser(wearerId);
    await admin.from("roles").delete().eq("id", roleId);
  }
});
