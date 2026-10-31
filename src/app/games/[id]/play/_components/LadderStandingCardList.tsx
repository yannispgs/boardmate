import type { PlayerId } from "@/lib/domain";
import type { LadderStanding } from "@/lib/game/ladder";

import { LadderStandingCard } from "./LadderStandingCard";

/** The standings of a laddered game, highest climb first. */
export function LadderStandingCardList({
  standings,
  players,
  rungLabel,
  top,
  showPoints,
}: Readonly<{
  standings: readonly LadderStanding[];
  players: ReadonlyArray<{ id: PlayerId; name: string }>;
  rungLabel: string;
  top: number;
  showPoints: boolean;
}>) {
  const nameOf = new Map(players.map(p => [p.id, p.name]));

  return (
    <ul className="flex w-full flex-col gap-2">
      {standings.map(standing => (
        <LadderStandingCard
          key={standing.playerId}
          name={nameOf.get(standing.playerId) ?? "—"}
          standing={standing}
          rungLabel={rungLabel}
          top={top}
          showPoints={showPoints}
        />
      ))}
    </ul>
  );
}
