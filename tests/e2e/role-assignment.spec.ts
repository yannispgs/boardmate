import { expect, type Page, test } from "@playwright/test";

import { adminClient } from "./utils/supabase";

/**
 * Handing a role to an account and taking it back, from the administration
 * screen (full-suite only — untagged). The other end of `role-composition`:
 * that one builds the bundle, this one puts it on somebody.
 */

/** Opens the accounts tab, where the roles are handed out. */
async function openAccounts(page: Page) {
  await page.goto("/admin");
  await page.getByRole("button", { name: "Comptes" }).click();
}

function card(page: Page, label: string) {
  return page.getByRole("listitem").filter({ hasText: label }).first();
}

test("hands a role to an account, then takes it back", async ({ page }) => {
  const admin = adminClient();
  const label = `Attribué ${Date.now().toString(36)}`;
  const email = `assignee_${Date.now()}@example.com`;
  const { data: role } = await admin
    .from("roles")
    .insert({ key: `attribue-${Date.now().toString(36)}`, label })
    .select("id")
    .single();
  const roleId = role?.id as string;
  const { data: created } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  const accountId = created?.user?.id as string;

  try {
    await openAccounts(page);

    const account = card(page, email);
    await expect(account.getByText("Aucun rôle attribué.")).toBeVisible();
    // Created and never signed in — the sign an invitation went nowhere.
    await expect(account.getByText("Jamais connecté")).toBeVisible();

    await account
      .getByLabel(`Rôle à attribuer à ${email}`)
      .selectOption({ label });
    await account.getByRole("button", { name: "Attribuer" }).click();

    await expect(account.getByText(label)).toBeVisible();

    // …and it drops out of the picker, so the same role is never handed twice.
    await expect(
      account.getByLabel(`Rôle à attribuer à ${email}`).getByRole("option", {
        name: label,
      }),
    ).toHaveCount(0);

    await account.getByRole("button", { name: `Retirer ${label}` }).click();

    const confirmation = page
      .getByRole("dialog")
      .filter({ hasText: /Retirer le rôle/ });
    await expect(confirmation).toContainText(email);
    await confirmation.getByRole("button", { name: "Retirer" }).click();

    await expect(account.getByText("Aucun rôle attribué.")).toBeVisible();
  } finally {
    await admin.auth.admin.deleteUser(accountId);
    await admin.from("roles").delete().eq("id", roleId);
  }
});

test("shows the administrator role without any way to take it off", async ({
  page,
}) => {
  await openAccounts(page);

  // The signed-in account of the suite is the administrator one, so it is its
  // own card that carries the badge nobody can close.
  const mine = card(page, "Administrateur");

  await expect(
    mine.getByRole("button", { name: "Retirer Administrateur" }),
  ).toHaveCount(0);
  await expect(mine.getByText(/se retire en base de données/)).toBeVisible();
});
