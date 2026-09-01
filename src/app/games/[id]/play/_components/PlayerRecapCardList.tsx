"use client";

import type { PlayerRecap } from "@/lib/game/player-recap";

import { PlayerRecapCard } from "./PlayerRecapCard";

/** The table's recaps, in seating order — the order the sheet is read in. */
export function PlayerRecapCardList({
  recaps,
  rightGutter,
}: Readonly<{
  recaps: readonly PlayerRecap[];
  /** Keep the rows clear of whatever is pinned to the screen's right edge. */
  rightGutter: boolean;
}>) {
  return (
    <ul className={`flex flex-col gap-3 ${rightGutter ? "pe-10" : ""}`}>
      {recaps.map(recap => (
        <PlayerRecapCard key={recap.playerId} recap={recap} />
      ))}
    </ul>
  );
}
