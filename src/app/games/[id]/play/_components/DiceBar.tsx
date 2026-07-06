"use client";

import type { DiceValueStat } from "@/lib/game/dice";

const TRACK = 88; // px available for a bar
const STUB = 6; // min bar height so empty values stay visible + tappable

/**
 * One-tap dice input that doubles as a live histogram. Each value is a bar whose
 * height is how often it's been rolled and whose colour is how "cold" it is —
 * the longer a number has gone without coming up, the more vivid the blue, so
 * the numbers that are "due" jump out. Tapping a bar records one roll of that
 * value. The most recent roll is ringed.
 */
export function DiceBar({
  values,
  stats,
  lastRolled,
  onRoll,
  disabled,
}: {
  values: number[];
  stats: Record<number, DiceValueStat>;
  lastRolled: number | null;
  onRoll: (value: number) => void;
  disabled: boolean;
}) {
  const maxCount = Math.max(1, ...values.map(v => stats[v]?.count ?? 0));
  // A value absent for a full cycle of values reads as fully cold.
  const scale = values.length;

  return (
    <div className="w-full max-w-sm">
      <div className="flex items-end justify-between gap-1">
        {values.map(value => {
          const stat = stats[value];
          const count = stat?.count ?? 0;
          const coldness = Math.min(1, (stat?.currentDrought ?? 0) / scale);
          const height = STUB + (count / maxCount) * (TRACK - STUB);
          const isLast = value === lastRolled;

          return (
            <button
              key={value}
              type="button"
              onClick={() => onRoll(value)}
              disabled={disabled}
              aria-label={`Lancer de ${value}`}
              className="flex flex-1 flex-col items-center justify-end gap-1 disabled:opacity-60"
            >
              <span className="h-3 text-[10px] text-zinc-400 tabular-nums leading-none">
                {count || ""}
              </span>
              <span
                className={`w-full rounded-t transition-all ${
                  isLast ? "ring-2 ring-amber-400" : ""
                }`}
                style={{
                  height,
                  backgroundColor: `hsl(205, ${30 + 60 * coldness}%, ${
                    58 - 12 * coldness
                  }%)`,
                }}
              />
              <span className="text-sm font-medium tabular-nums">{value}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
