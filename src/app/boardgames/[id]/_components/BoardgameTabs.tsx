"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { tabBarClass, tabPillClass } from "@/components/TabButton";

/** The facets of one game, in the order you meet them. */
const TABS = [
  { segment: "edit", label: "Configuration" },
  { segment: "extensions", label: "Extensions" },
  { segment: "records", label: "Records" },
] as const;

/**
 * The tab bar of a game's own page. Each tab is a real URL rather than a piece
 * of state: a game is a place, so its facets are shareable, the back button
 * walks between them, and a link from elsewhere can open the one it means.
 *
 * The pill follows the path, so it moves the moment the router commits the
 * navigation — which is at the press, thanks to each tab's `loading.tsx`
 * ({@link TabSkeleton}). Remove those and the pill goes back to waiting for the
 * server, which reads as a click that missed.
 */
export function BoardgameTabs({
  boardgameId,
}: Readonly<{ boardgameId: string }>) {
  const pathname = usePathname();
  const open = pathname.split("/").at(-1);

  return (
    <nav className={tabBarClass}>
      {TABS.map(tab => (
        <Link
          key={tab.segment}
          href={`/boardgames/${boardgameId}/${tab.segment}`}
          // Which one is open, said in the markup and not only in a colour —
          // it is what the suite reads to prove the pill moves on the press.
          aria-current={tab.segment === open ? "page" : undefined}
          className={`text-center ${tabPillClass(tab.segment === open)}`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
