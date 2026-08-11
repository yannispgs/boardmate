import type { PlayerId } from "@/lib/domain";
import type { MilestoneRow } from "@/lib/game/milestones";

import { MilestoneCard } from "./MilestoneCard";

/** Every milestone the game offers, in the rulebook's order (see `milestoneRows`). */
export function MilestoneCardList({
  rows,
  seats,
  points,
  disabled,
  onClaim,
  onRelease,
}: Readonly<{
  rows: MilestoneRow[];
  seats: ReadonlyArray<{ id: PlayerId; name: string }>;
  points: number;
  disabled: boolean;
  onClaim: (milestoneKey: string, playerId: PlayerId) => void;
  onRelease: (milestoneKey: string) => void;
}>) {
  return (
    <ul className="flex flex-col gap-3">
      {rows.map(row => (
        <MilestoneCard
          key={row.key}
          row={row}
          seats={seats}
          points={points}
          disabled={disabled}
          onClaim={playerId => onClaim(row.key, playerId)}
          onRelease={() => onRelease(row.key)}
        />
      ))}
    </ul>
  );
}
