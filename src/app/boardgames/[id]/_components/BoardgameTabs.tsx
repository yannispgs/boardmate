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
          className={`text-center ${tabPillClass(tab.segment === open)}`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
