"use client";

import { type ReactNode, useState } from "react";

import { TabButton, tabBarClass } from "@/components/TabButton";

/** The two readings of a finished party, named once for the whole screen. */
export const PARTY_TAB = "La partie";
export const PLAYERS_TAB = "Les joueurs";

/**
 * The two readings of the evening that just ended, one *behind* the other
 * instead of one *under* it: what the table did (« La partie ») and what each
 * player did against his own past (« Les joueurs »).
 *
 * They used to be stacked, which made the finished-game screen a page you
 * scrolled twice over — each side is a screenful of tiles and charts, and
 * nobody reads both at once: you come for the evening or you come for a career.
 *
 * The bar is also the panels' title, which is why neither carries a heading of
 * its own any more — a pill saying « La partie » above a heading saying « La
 * partie » names the same thing twice. When only one side has something to say
 * (a game recording neither turn nor manche has no party panel; a table playing
 * it for the first time has no history) the bar would be a lone tab switching
 * nothing, so the name goes back to being a plain heading over a lone panel.
 */
export function EndRecapTabs({
  party,
  players,
}: Readonly<{ party: ReactNode; players: ReactNode }>) {
  const [open, setOpen] = useState<"party" | "players">("party");

  if (party === null && players === null) {
    return null;
  }

  if (party === null || players === null) {
    return (
      <Lone title={party === null ? PLAYERS_TAB : PARTY_TAB}>
        {party ?? players}
      </Lone>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className={tabBarClass}>
        <TabButton active={open === "party"} onClick={() => setOpen("party")}>
          {PARTY_TAB}
        </TabButton>
        <TabButton
          active={open === "players"}
          onClick={() => setOpen("players")}
        >
          {PLAYERS_TAB}
        </TabButton>
      </div>

      {open === "party" ? party : players}
    </div>
  );
}

/**
 * The one panel there is, under the name the tab would have carried. Same shape
 * as the bar above so the screen doesn't shift depending on how much the
 * evening had to say.
 */
function Lone({
  title,
  children,
}: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-center text-lg font-semibold">{title}</h2>

      {children}
    </div>
  );
}
