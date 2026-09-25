/** The three angles the access model is read from. */
export type AccessTab = "permissions" | "roles" | "accounts";

const TABS: readonly AccessTab[] = ["permissions", "roles", "accounts"];

/**
 * The tab named by `?onglet=`, or the catalogue when the value is missing or
 * unknown — a hand-typed address never lands on a blank screen.
 *
 * Kept out of the tab bar's module on purpose: that one is a client module, and
 * the page calls this while rendering on the server.
 */
export function accessTabFromParam(value: string | undefined): AccessTab {
  return TABS.find(tab => tab === value) ?? "permissions";
}
