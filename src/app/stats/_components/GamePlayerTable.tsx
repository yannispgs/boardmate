import type { PlayerAggregate } from "@/lib/game/global-stats";
import type { TallyExitStat } from "@/lib/game/tally-averages";

import { GamePlayerRow } from "./GamePlayerRow";

/**
 * The per-player table for a single game: each player's record on that game
 * (over the selected parties). `scored` hides the score column for games that
 * don't keep one. `timed` hides the two time figures on a game that never
 * attributes a turn to a player — there, a « Tour moy. » is a zero, not a fact —
 * and `exits` puts the manche figures in their place when the game counts
 * manches.
 */
export function GamePlayerTable({
  players,
  scored,
  timed,
  exits,
}: Readonly<{
  players: PlayerAggregate[];
  scored: boolean;
  timed: boolean;
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
          timed={timed}
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
