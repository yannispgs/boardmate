"use client";

import {
  CLOCK_STEPS_S,
  canStep,
  elapsedForReading,
} from "@/lib/game/turn-clock";

/** A step as it reads on its button: "10 s", "30 s", "1 min". */
function stepLabel(seconds: number): string {
  return seconds < 60 ? `${seconds} s` : `${seconds / 60} min`;
}

/** The round buttons sat beside the clock. */
export const clockButtonClass =
  "flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-xl font-semibold text-zinc-600 shadow-sm transition hover:bg-zinc-50 dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800";

/**
 * One of the two corrections sat beside the clock: ＋ gives the clock time,
 * － takes some off. Pressed, it unfolds its three steps alongside the top or
 * bottom edge of the disc — never over the figures, which have to stay readable
 * while they are being set — and each step lands on the clock at once.
 *
 * The signs read on the clock, not on the time played: « +30 s » shows thirty
 * seconds more to play on a countdown, and thirty seconds more played on a
 * stopwatch. A step that would take the clock somewhere it cannot read — below
 * nought, past the turn's length — is greyed out.
 *
 * Open or shut is the caller's: the two share one place, and only one is open
 * at a time.
 */
export function ClockNudge({
  sign,
  durationS,
  readingS,
  open,
  onOpen,
  onStep,
  edge,
}: Readonly<{
  sign: 1 | -1;
  /** The turn's allotted seconds, or `null` for a table stopwatch. */
  durationS: number | null;
  /** What the clock reads now. */
  readingS: number;
  open: boolean;
  onOpen: () => void;
  /** The active seconds the clock is to be credited with. */
  onStep: (elapsedS: number) => void;
  /** The edge of the disc the button sits level with, and its steps unfold along. */
  edge: "top" | "bottom";
}>) {
  const verb = sign > 0 ? "Ajouter" : "Retirer";
  const glyph = sign > 0 ? "+" : "−";
  const level = edge === "top" ? "top-0" : "bottom-0";

  return (
    <div className={`absolute right-full mr-2 ${level} z-30`}>
      <button
        type="button"
        aria-label={sign > 0 ? "Ajouter du temps" : "Retirer du temps"}
        aria-expanded={open}
        onClick={onOpen}
        className={`${clockButtonClass} ${open ? "ring-2 ring-indigo-500" : ""}`}
      >
        {glyph}
      </button>

      {open ? (
        <div
          role="group"
          aria-label={sign > 0 ? "Ajouter du temps" : "Retirer du temps"}
          className={`absolute left-full ml-2 ${level} flex gap-1 rounded-xl border border-black/10 bg-white p-1 shadow-lg dark:border-white/15 dark:bg-zinc-900`}
        >
          {CLOCK_STEPS_S.map(s => {
            const delta = sign * s;

            return (
              <button
                key={s}
                type="button"
                aria-label={`${verb} ${stepLabel(s)}`}
                disabled={!canStep(durationS, readingS, delta)}
                onClick={() =>
                  onStep(elapsedForReading(durationS, readingS + delta))
                }
                className="whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm font-medium tabular-nums transition hover:bg-black/5 disabled:opacity-30 disabled:hover:bg-transparent dark:hover:bg-white/5"
              >
                {glyph}
                {stepLabel(s)}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
