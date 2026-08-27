"use client";

import type { Player, PlayerId } from "@/lib/domain";
import { PlayerPickCard } from "./PlayerPickCard";

/**
 * The players to pick from, drawn in the order they're given — the step floats
 * the picked ones to the top so the running order reads off the head of the
 * list instead of being hunted for among the players left out.
 */
export function PlayerPickCardList({
  players,
  selected,
  ordered,
  onToggle,
}: Readonly<{
  players: Player[];
  /** The picked players' ids, in play order. */
  selected: PlayerId[];
  /** Whether the game hands the turn from one player to the next. */
  ordered: boolean;
  onToggle: (id: PlayerId) => void;
}>) {
  return (
    <ul className="flex flex-col gap-2">
      {players.map(p => {
        const seat = selected.indexOf(p.id);

        return (
          <li key={p.id}>
            <PlayerPickCard
              player={p}
              order={seat === -1 ? null : seat + 1}
              ordered={ordered}
              onToggle={() => onToggle(p.id)}
            />
          </li>
        );
      })}
    </ul>
  );
}
