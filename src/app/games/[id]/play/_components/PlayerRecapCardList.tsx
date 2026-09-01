"use client";

import type { PlayerRecap } from "@/lib/game/player-recap";

import { PlayerRecapCard } from "./PlayerRecapCard";

/** The table's recaps, in seating order — the order the sheet is read in. */
export function PlayerRecapCardList({
  recaps,
}: Readonly<{ recaps: readonly PlayerRecap[] }>) {
  return (
    <ul className="flex flex-col gap-3">
      {recaps.map(recap => (
        <PlayerRecapCard key={recap.playerId} recap={recap} />
      ))}
    </ul>
  );
}
