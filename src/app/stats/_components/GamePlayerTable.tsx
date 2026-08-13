import type { PlayerAggregate } from "@/lib/game/global-stats";
import type { TallyExitStat } from "@/lib/game/tally-averages";

import { GamePlayerRow } from "./GamePlayerRow";

/**
 * The per-player table for a single game: each player's record on that game
 * (over the selected parties). `scored` hides the score column for games that
 * don't keep one. `exits` swaps the two time figures for the manche ones on a
 * game that records no turn — there, a « Tour moy. » is a zero, not a fact.
 */
export function GamePlayerTable({
  players,
  scored,
  exits,
}: Readonly<{
  players: PlayerAggregate[];
  scored: boolean;
  exits: TallyExitStat[] | null;
}>) {
  return (
    <ul className="flex flex-col gap-3">
      {players.map((player, i) => (
        <GamePlayerRow
          key={player.playerId}
          rank={i + 1}
          player={player}
          scored={scored}
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
  );
}
