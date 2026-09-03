"use client";

import type { PlayerRecap } from "@/lib/game/player-recap";

import { PlayerRecapCard } from "./PlayerRecapCard";

/** The table's recaps, already ordered by where each player finished. */
export function PlayerRecapCardList({
  recaps,
  rightGutter,
}: Readonly<{
  recaps: readonly PlayerRecap[];
  /** Keep the rows clear of whatever is pinned to the screen's right edge. */
  rightGutter: boolean;
}>) {
  return (
    <ul
      // A hook for the e2e suite, which is the only thing that measures this
      // list: the order of the rows, the size of the podium's names and the
      // fact that the three metals differ are facts about the whole list, not
      // about any one row.
      data-testid="player-recaps"
      className={`flex flex-col gap-3 ${rightGutter ? "pe-10" : ""}`}
    >
      {recaps.map(recap => (
        <PlayerRecapCard key={recap.playerId} recap={recap} />
      ))}
    </ul>
  );
}
