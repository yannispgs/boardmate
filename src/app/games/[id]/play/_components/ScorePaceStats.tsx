import { InfoTip } from "@/components/InfoTip";
import type { PopulatedGame } from "@/lib/domain";
import type { PacePlayer } from "@/lib/game/score-pace";
import { nearMisses, scorePace } from "@/lib/game/score-pace";
import type { PlayerTimeStats } from "@/lib/game/stats";

import { NearMissCardList } from "./NearMissCardList";
import { ScorePaceCardList } from "./ScorePaceCardList";

/**
 * Score read per turn played, for the games that can stop mid-lap
 * (`turnCountVaries`) and therefore don't hand everyone the same number of
 * turns. Shown only when the players' turn counts actually differ — on a game
 * that happened to end on a whole lap it would say nothing.
 *
 * Indicator only: the winner, the ranking and the tie-break are decided
 * elsewhere and this never enters into them.
 */
export function ScorePaceStats({
  game,
  timeStats,
}: {
  game: PopulatedGame;
  /** Per-player time stats, the only place turns are already counted. */
  timeStats: PlayerTimeStats[];
}) {
  const turnsOf = new Map(timeStats.map(s => [s.playerId, s.turnCount]));
  const players: PacePlayer[] = game.players.map(p => ({
    playerId: p.playerId,
    name: p.player.name,
    score: p.score,
    turnCount: turnsOf.get(p.playerId) ?? 0,
  }));

  const counts = new Set(players.map(p => p.turnCount));

  if (counts.size < 2) {
    return null;
  }

  const paces = scorePace(players);
  const misses = nearMisses(players);
  const winnerIds = game.players.filter(p => p.isWinner).map(p => p.playerId);

  return (
    <div className="flex flex-col gap-3">
      <h3 className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 dark:text-zinc-400">
        Points par tour joué
        <InfoTip label="Points par tour joué">
          <p>
            La partie s&apos;est arrêtée en plein tour de table&nbsp;: tout le
            monde n&apos;a pas joué le même nombre de tours.
          </p>
          <p>
            Le score ramené au nombre de tours dit qui a été le plus efficace,
            indépendamment de qui a été servi le dernier.
          </p>
          <p>
            <strong>Indicatif uniquement</strong>&nbsp;: le vainqueur et le
            classement restent ceux du score final. Et les points d&apos;un jeu
            ne tombent pas régulièrement (les combinaisons de fin comptent
            gros), donc c&apos;est une tendance, pas une preuve.
          </p>
        </InfoTip>
      </h3>

      <ScorePaceCardList paces={paces} winnerIds={winnerIds} />

      {misses.length > 0 ? <NearMissCardList misses={misses} /> : null}
    </div>
  );
}
