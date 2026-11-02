import { NumberStepper } from "@/components/NumberStepper";
import type { PlayerId } from "@/lib/domain";

import { CheckChip } from "./CheckChip";

/**
 * One player's line at the end of a manche: his points, and — on a laddered
 * game — the box he ticks once he laid his phase down, named after the phase
 * so nobody has to remember which one he was on.
 */
export function StagePointsRow({
  player,
  points,
  min = 0,
  max,
  step,
  rung,
  rungLabel,
  cleared,
  disabled,
  onPoints,
  onCleared,
}: Readonly<{
  player: { id: PlayerId; name: string };
  points: number;
  /** The lowest the arrows go — a whole hand, without the phase down. */
  min?: number;
  max: number | null;
  step: number;
  /** The rung he is working on and what it asks, or null with no ladder. */
  rung: { rung: number; step: string } | null;
  /** What one rung is called (« Phase »). */
  rungLabel: string;
  cleared: boolean;
  disabled: boolean;
  onPoints: (points: number) => void;
  onCleared: (cleared: boolean) => void;
}>) {
  return (
    <li className="flex flex-col gap-2 rounded-lg border border-black/10 px-3 py-2 dark:border-white/10">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 flex-1 truncate text-sm">{player.name}</span>
        <NumberStepper
          label={player.name}
          value={points}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={onPoints}
        />
      </div>

      {rung === null ? null : (
        <CheckChip checked={cleared} disabled={disabled} onChange={onCleared}>
          {rungLabel} {rung.rung} réalisée{" "}
          <span className="text-zinc-500 dark:text-zinc-400">
            · {rung.step}
          </span>
        </CheckChip>
      )}
    </li>
  );
}
