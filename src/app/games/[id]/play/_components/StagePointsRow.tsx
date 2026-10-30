import { NumberStepper } from "@/components/NumberStepper";
import type { PlayerId } from "@/lib/domain";

/**
 * One player's line at the end of a manche: his points, and — on a laddered
 * game — the box he ticks once he laid his phase down, named after the phase
 * so nobody has to remember which one he was on.
 */
export function StagePointsRow({
  player,
  points,
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
          max={max}
          step={step}
          disabled={disabled}
          onChange={onPoints}
        />
      </div>

      {rung === null ? null : (
        <button
          type="button"
          aria-pressed={cleared}
          disabled={disabled}
          onClick={() => onCleared(!cleared)}
          className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs transition ${
            cleared
              ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-black/10 text-zinc-600 hover:bg-black/5 dark:border-white/15 dark:text-zinc-300 dark:hover:bg-white/5"
          }`}
        >
          <span
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
              cleared
                ? "border-emerald-500 bg-emerald-500 text-white"
                : "border-zinc-400"
            }`}
          >
            {cleared ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3 w-3"
                aria-hidden="true"
              >
                <path d="M4 12.5 9.5 18 20 6" />
              </svg>
            ) : null}
          </span>
          <span className="min-w-0 flex-1">
            {rungLabel} {rung.rung} réalisée{" "}
            <span className="text-zinc-500 dark:text-zinc-400">
              · {rung.step}
            </span>
          </span>
        </button>
      )}
    </li>
  );
}
