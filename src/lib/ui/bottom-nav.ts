/**
 * The tab bar at the foot of every screen: which tab a page belongs to, and
 * where the bar steps aside.
 *
 * The four main sections sit in it, one tap away; everything else goes behind
 * « Plus », two taps away. The tools (the wheel, the board generator) are on
 * the home page, so their screens light the home tab.
 *
 * Pure: no React, no Next, unit-tested.
 */

export type BottomTab = "home" | "games" | "boardgames" | "stats" | "more";

/** The screens behind « Plus », each a section of its own. */
export const MORE_PATHS = ["/players", "/faq", "/feedback", "/admin"] as const;

function within(pathname: string, section: string): boolean {
  return pathname === section || pathname.startsWith(`${section}/`);
}

/** The tab a screen lights, or null for one that belongs to none. */
export function activeTab(pathname: string): BottomTab | null {
  if (pathname === "/" || within(pathname, "/tools")) {
    return "home";
  }

  if (within(pathname, "/games")) {
    return "games";
  }

  if (within(pathname, "/boardgames")) {
    return "boardgames";
  }

  if (within(pathname, "/stats")) {
    return "stats";
  }

  if (MORE_PATHS.some(section => within(pathname, section))) {
    return "more";
  }

  return null;
}

/**
 * Whether the bar is shown. Not before signing in, and not over a game being
 * played: that screen is the table's, full height, and its own « ← Parties »
 * is the way out.
 */
export function showsBottomNav(pathname: string): boolean {
  if (within(pathname, "/login") || within(pathname, "/auth")) {
    return false;
  }

  return !/^\/games\/[^/]+\/play(\/|$)/.test(pathname);
}
