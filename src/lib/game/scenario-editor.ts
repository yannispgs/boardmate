/** The key the Marins extension is found by, whatever its name becomes. */
export const MARINS_KEY = "catan-marins";

/** A way back: where the link goes, and what it says. */
export interface BackLink {
  href: string;
  label: string;
}

/** The origin a board generator claims when it links to the extensions. */
export const MARINS_ORIGIN = "catan-marins";

/**
 * The screens that link into a game's extensions from somewhere other than the
 * games list, and the way back to each of them.
 */
const ORIGINS = new Map<string, BackLink>([
  [
    MARINS_ORIGIN,
    {
      href: "/tools/board-generator/catan-marins",
      label: "← Plateau Catan - Marins",
    },
  ],
]);

const GAMES_BACK_LINK: BackLink = { href: "/boardgames", label: "← Jeux" };

/**
 * Where a base game's extensions — and the scenarios they are managed on —
 * live. The board generator only reads scenarios, so it sends anyone wanting to
 * change one back to the game they belong to, saying where it comes from so
 * that screen can offer the way back.
 */
export function extensionScenariosHref(
  baseGameId: string,
  from?: string,
): string {
  const href = `/boardgames/${baseGameId}/extensions`;

  return from === undefined ? href : `${href}?from=${encodeURIComponent(from)}`;
}

/**
 * The way back out of a game's extensions: to whoever sent us there, or to the
 * games list. Only the screens listed above can claim it — the origin travels
 * in the URL, so an unknown one, or one crafted by hand, leads to the games
 * list rather than to wherever it asked for.
 */
export function extensionsBackLink(from: string | undefined): BackLink {
  return ORIGINS.get(from ?? "") ?? GAMES_BACK_LINK;
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
