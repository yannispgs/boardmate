/** The key the Marins extension is found by, whatever its name becomes. */
export const MARINS_KEY = "catan-marins";

/**
 * Where a base game's extensions — and the scenarios they are managed on —
 * live. The board generator only reads scenarios, so it sends anyone wanting to
 * change one back to the game they belong to.
 */
export function extensionScenariosHref(baseGameId: string): string {
  return `/boardgames/${baseGameId}/extensions`;
}

/**
 * Extensions whose scenarios can be authored in the app, by extension key. An
 * extension only gets an editor once its board generator knows how to draw
 * what the editor produces, so the rest keep their scenarios read-only.
 */
const EDITORS = new Set<string>([MARINS_KEY]);

/**
 * The key this extension's scenarios can be authored under, or null when they
 * are read-only reference data — which is what tells a scenario list whether to
 * offer editing them. An extension with no key at all is one nothing is built
 * around yet.
 */
export function editableScenarioKey(
  extensionKey: string | null,
): string | null {
  return extensionKey !== null && EDITORS.has(extensionKey)
    ? extensionKey
    : null;
}
