"use client";

import { useMemo, useState } from "react";

import { OptionPicker, type PickerOption } from "@/components/OptionPicker";
import type { PlayerId } from "@/lib/domain";
import type { PlayerAggregate } from "@/lib/game/global-stats";
import { orderPlayers, type PlayerOrder } from "@/lib/game/position-index";
import type { TallyExitStat } from "@/lib/game/tally-averages";

import { GamePlayerRow } from "./GamePlayerRow";

const ORDERS: PickerOption<PlayerOrder>[] = [
  { value: "winRate", label: "Taux de victoire" },
  { value: "position", label: "Position moyenne" },
];

/**
 * The per-player table for a single game: each player's record on that game
 * (over the selected parties). `scored` hides the score column for games that
 * don't keep one. `timed` hides the two time figures on a game that never
 * attributes a turn to a player — there, a « Tour moy. » is a zero, not a fact —
 * and `exits` puts the manche figures in their place when the game counts
 * manches.
 *
 * `positions` adds, on a game that ranks its players, a position bar under each
 * win rate and the choice of ordering the list by either. Where the game ranks
 * nobody (no scores, « Tous les jeux ») it is null, and the list is ordered by
 * win rate with nothing to choose.
 */
export function GamePlayerTable({
  players,
  scored,
  timed,
  exits,
  positions,
}: Readonly<{
  players: PlayerAggregate[];
  scored: boolean;
  timed: boolean;
  exits: TallyExitStat[] | null;
  positions: ReadonlyMap<PlayerId, number> | null;
}>) {
  const [order, setOrder] = useState<PlayerOrder>("winRate");
  const shownOrder = positions === null ? "winRate" : order;
  const ordered = useMemo(
    () => orderPlayers(players, shownOrder, positions ?? new Map()),
    [players, shownOrder, positions],
  );

  return (
    <div className="flex flex-col gap-3">
      {positions === null ? null : (
        <OptionPicker
          variant="chips"
          label="Trier par"
          options={ORDERS}
          value={order}
          onChange={setOrder}
        />
      )}

      <ul className="flex flex-col gap-3">
        {ordered.map((player, i) => (
          <GamePlayerRow
            key={player.playerId}
            rank={i + 1}
            player={player}
            scored={scored}
            timed={timed}
            position={
              positions === null
                ? undefined
                : (positions.get(player.playerId) ?? null)
            }
            tally={
              exits === null
                ? null
                : (exits.find(e => e.playerId === player.playerId) ?? {
                    stages: 0,
                    exits: 0,
                  })
            }
          />
        ))}
      </ul>
    </div>
  );
}
