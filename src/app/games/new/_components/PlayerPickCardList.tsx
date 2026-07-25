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
  simultaneous,
  onToggle,
}: {
  players: Player[];
  /** The picked players' ids, in play order. */
  selected: PlayerId[];
  simultaneous: boolean;
  onToggle: (id: PlayerId) => void;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {players.map(p => {
        const seat = selected.indexOf(p.id);

        return (
          <li key={p.id}>
            <PlayerPickCard
              player={p}
              order={seat === -1 ? null : seat + 1}
              simultaneous={simultaneous}
              onToggle={() => onToggle(p.id)}
            />
          </li>
        );
      })}
    </ul>
  );
}
