/** Where the Catan - Marins scenarios are authored. */
export const MARINS_SCENARIOS_HREF =
  "/tools/board-generator/catan-marins/scenarios";

/**
 * Extensions whose scenarios can be authored in the app, by extension key. An
 * extension only gets an editor once its board generator knows how to draw
 * what the editor produces, so the rest keep their scenarios read-only.
 */
const EDITORS: Record<string, string> = {
  "catan-marins": MARINS_SCENARIOS_HREF,
};

/**
 * The screen that authors this extension's scenarios, or null when it has
 * none — which is what tells a scenario list whether to offer "add one". An
 * extension with no key at all is one nothing is built around yet.
 */
export function scenarioEditorHref(extensionKey: string | null): string | null {
  return extensionKey === null ? null : (EDITORS[extensionKey] ?? null);
}
