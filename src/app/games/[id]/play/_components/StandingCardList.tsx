import type { PlayerId } from "@/lib/domain";
import type { Standing } from "@/lib/game/stage-tally";

import { StandingCard } from "./StandingCard";

/**
 * The table's standings, best first. Fed by {@link stageStandings}, so « best »
 * is already the game's own direction — the lowest total leads in Odin.
 */
export function StandingCardList({
  standings,
  players,
  showPoints,
  target,
}: Readonly<{
  standings: readonly Standing[];
  players: ReadonlyArray<{ id: PlayerId; name: string }>;
  showPoints: boolean;
  /** The total that stops the game, or null when nothing stops it. */
  target: number | null;
}>) {
  const nameOf = new Map(players.map(p => [p.id, p.name]));

  return (
    <ul className="flex w-full flex-col gap-2">
      {standings.map(standing => (
        <StandingCard
          key={standing.playerId}
          name={nameOf.get(standing.playerId) ?? "—"}
          standing={standing}
          showPoints={showPoints}
          atRisk={target !== null && standing.total >= target}
        />
      ))}
    </ul>
  );
}
