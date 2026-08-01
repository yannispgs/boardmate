"use client";

import { chipClass } from "@/components/ui";
import { narrowestWidth, setBoardWidth } from "@/lib/catan/scenario-draft";
import {
  MAX_WIDTH,
  MIN_WIDTH,
  type ScenarioSpec,
} from "@/lib/catan/scenario-spec";

/**
 * How wide the Marins outline is cut, in tiles on its edge rows. Widening adds a
 * ring of empty spaces; narrowing stops at the outermost space already painted,
 * so a stray click can never crop an island out of sight.
 */
export function WidthStepper({
  spec,
  board,
  width,
  onChange,
}: Readonly<{
  spec: ScenarioSpec;
  board: number;
  width: number;
  onChange: (spec: ScenarioSpec) => void;
}>) {
  const floor = narrowestWidth(spec.boards[board] ?? spec.boards[0]);
  const cramped = width <= floor && width > MIN_WIDTH;

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-zinc-500 dark:text-zinc-400">
        Largeur du plateau
      </span>
      <button
        type="button"
        onClick={() => onChange(setBoardWidth(spec, board, width - 1))}
        disabled={width <= floor}
        className={`${chipClass(false)} disabled:opacity-30`}
      >
        −
      </button>
      <span className="w-6 text-center font-semibold tabular-nums">
        {width}
      </span>
      <button
        type="button"
        onClick={() => onChange(setBoardWidth(spec, board, width + 1))}
        disabled={width >= MAX_WIDTH}
        className={`${chipClass(false)} disabled:opacity-30`}
      >
        +
      </button>
      <span className="text-xs text-zinc-500 dark:text-zinc-400">
        {width} tuiles sur les rangées du bord, {width + 3} au milieu
        {cramped ? " · réduire découperait une zone peinte" : ""}
      </span>
    </div>
  );
}
