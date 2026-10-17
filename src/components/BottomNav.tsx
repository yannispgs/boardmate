"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

import { activeTab, showsBottomNav } from "@/lib/ui/bottom-nav";

import { BottomNavTab } from "./BottomNavTab";
import { CardsIcon, ChartIcon, DiceIcon, HomeIcon, MoreIcon } from "./icons";
import { MoreSheet } from "./MoreSheet";

const ICON = "h-6 w-6";

/**
 * The tab bar at the foot of every signed-in screen: the four main sections
 * one tap away, the rest behind « Plus ». It steps aside over a game being
 * played (see {@link showsBottomNav}).
 *
 * `data-bottom-nav` is what the stylesheet keys the bar's height on, so screens
 * sized to the viewport and sticky footers leave it room — and stop doing so
 * the moment it is gone.
 */
export function BottomNav({
  email,
  canAdmin,
  version,
}: Readonly<{
  email: string;
  canAdmin: boolean;
  version: string;
}>) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  if (!showsBottomNav(pathname)) {
    return null;
  }

  const active = activeTab(pathname);

  return (
    <>
      <nav
        data-bottom-nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-40 border-black/10 border-t bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-white/10 dark:bg-zinc-950/95"
      >
        <div className="mx-auto grid max-w-2xl grid-cols-5">
          <BottomNavTab
            href="/"
            label="Accueil"
            icon={<HomeIcon className={ICON} />}
            active={active === "home"}
          />
          <BottomNavTab
            href="/games"
            label="Parties"
            icon={<CardsIcon className={ICON} />}
            active={active === "games"}
          />
          <BottomNavTab
            href="/boardgames"
            label="Jeux"
            icon={<DiceIcon className={ICON} />}
            active={active === "boardgames"}
          />
          <BottomNavTab
            href="/stats"
            label="Stats"
            icon={<ChartIcon className={ICON} />}
            active={active === "stats"}
          />
          <BottomNavTab
            label="Plus"
            icon={<MoreIcon className={ICON} />}
            active={active === "more" || moreOpen}
            onClick={() => setMoreOpen(true)}
          />
        </div>
      </nav>

      <MoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        email={email}
        canAdmin={canAdmin}
        version={version}
      />
    </>
  );
}
