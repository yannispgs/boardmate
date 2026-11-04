/**
 * The two halves of « Parties »: the games still on the table and the history.
 * The tab rides in the address (`?vue=terminees`), so « Tout voir » on the home
 * page can open the history directly, and coming back from a finished game
 * lands on the tab it was opened from.
 */
export type GamesTab = "live" | "ended";

/** How each tab is spelled in the address. */
const PARAMS: ReadonlyMap<GamesTab, string> = new Map([
  ["live", "en-cours"],
  ["ended", "terminees"],
]);

/** The address of « Parties » opened on a tab. */
export function gamesTabHref(tab: GamesTab): string {
  return `/games?vue=${PARAMS.get(tab)}`;
}

/**
 * The tab an address asks for, or `null` when it asks for none — or for
 * something that is not a tab: a hand-typed or stale address just opens the
 * screen as usual.
 */
export function tabFromParam(
  value: string | string[] | undefined,
): GamesTab | null {
  for (const [tab, param] of PARAMS) {
    if (value === param) {
      return tab;
    }
  }

  return null;
}

/**
 * The tab the screen shows: the one asked for, else the games on the table
 * when there are any — what the table usually came for — and the history
 * otherwise, rather than an empty list.
 */
export function shownTab(asked: GamesTab | null, running: number): GamesTab {
  return asked ?? (running > 0 ? "live" : "ended");
}
