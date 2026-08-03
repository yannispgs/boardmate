import type { PlayerId } from "@/lib/domain";
import type { PlayerPace } from "@/lib/game/score-pace";

import { ScorePaceCard } from "./ScorePaceCard";

/** The per-player pace breakdown, in the ranking order `scorePace` returns. */
export function ScorePaceCardList({
  paces,
  winnerIds,
}: {
  paces: PlayerPace[];
  winnerIds: PlayerId[];
}) {
  const scale = Math.max(...paces.map(p => p.perTurn ?? 0), 0);
  const shortest = Math.min(...paces.map(p => p.turnCount));

  return (
    <ul className="flex flex-col gap-4">
      {paces.map((pace, i) => (
        <ScorePaceCard
          key={pace.playerId}
          pace={pace}
          rank={i + 1}
          isWinner={winnerIds.includes(pace.playerId)}
          scale={scale}
          shortest={shortest}
        />
      ))}
    </ul>
  );
}
