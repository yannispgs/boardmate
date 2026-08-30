"use client";

import type { PlayerId } from "@/lib/domain";
import type { PlayerRecap } from "@/lib/game/player-recap";

import { PlayerRecapCard } from "./PlayerRecapCard";

/** The table's recaps, in seating order — the order the sheet is read in. */
export function PlayerRecapCardList({
  recaps,
  onOpen,
}: Readonly<{
  recaps: readonly PlayerRecap[];
  onOpen: (playerId: PlayerId) => void;
}>) {
  return (
    <ul className="flex flex-col gap-2">
      {recaps.map(recap => (
        <PlayerRecapCard
          key={recap.playerId}
          recap={recap}
          onOpen={() => onOpen(recap.playerId)}
        />
      ))}
    </ul>
  );
}
