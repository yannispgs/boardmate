import type { PlayerId } from "@/lib/domain";

import { CheckChip } from "./CheckChip";
import { PointsCell } from "./PointsCell";

/**
 * One player's line at the end of a donne played on bets (Luz): whether they
 * took the safety token, and the points the donne paid them — a figure that
 * opens the wheel of what the bet can pay.
 */
export function BetPointsRow({
  player,
  stageName,
  points,
  hedged,
  hedgeLabel,
  disabled,
  onEdit,
  onHedged,
}: Readonly<{
  player: { id: PlayerId; name: string };
  /** « donne 2 » — what the cell is found by. */
  stageName: string;
  points: number | null;
  hedged: boolean;
  /** What the hedge is called (« Jeton Sécurité »). */
  hedgeLabel: string;
  disabled: boolean;
  onEdit: () => void;
  onHedged: (hedged: boolean) => void;
}>) {
  return (
    <li className="flex items-center gap-2 rounded-lg border border-black/10 px-3 py-2 dark:border-white/10">
      <span className="min-w-0 flex-1 truncate text-sm">{player.name}</span>
      <CheckChip checked={hedged} disabled={disabled} onChange={onHedged}>
        {hedgeLabel}
      </CheckChip>
      <PointsCell
        label={`${player.name}, ${stageName}`}
        points={points}
        disabled={disabled}
        onEdit={onEdit}
      />
    </li>
  );
}
