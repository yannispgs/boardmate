"use client";

import { formatDuration } from "@/lib/game/format-time";
import type { UseDimVeil } from "./use-dim-veil";

/**
 * The black screen a paused game falls into. It covers everything, so the first
 * touch anywhere lands here and lifts it rather than reaching a control
 * underneath — nobody has to aim while the screen is dark.
 *
 * What little it shows is deliberately barely legible: the point is an unlit
 * screen, and a bright line of text would defeat it.
 *
 * It takes the whole of {@link useDimVeil} rather than a flag and a callback:
 * whether the screen is dark and how it is lifted are one thing, and splitting
 * them across the caller only handed the caller a decision it had no stake in.
 */
export function DimVeil({
  veil,
  elapsedS,
}: Readonly<{ veil: UseDimVeil; elapsedS: number }>) {
  if (!veil.dimmed) {
    return null;
  }

  return (
    <div
      onPointerDown={veil.lift}
      className="animate-dim-in fixed inset-0 z-50 flex flex-col items-center justify-center gap-2 bg-black"
    >
      <span className="text-5xl font-light tabular-nums text-zinc-700">
        {formatDuration(elapsedS)}
      </span>

      <span className="text-xs uppercase tracking-widest text-zinc-800">
        En pause
      </span>

      <span className="mt-8 text-xs text-zinc-800">Touche pour rallumer</span>
    </div>
  );
}
