"use client";

import { useState } from "react";
import { clockReading } from "@/lib/game/turn-clock";
import type { UseTurnTimer } from "@/lib/hooks/use-turn-timer";
import { ClockNudge } from "./ClockNudge";

/**
 * The clock the table watches, with what sets it by hand around it: ＋ level
 * with the top of the disc and － level with its bottom, in the margin on its
 * left — and, just under it, whatever else the clock carries (the timer's
 * settings, on a countdown only: a stopwatch has nothing to set).
 *
 * Opening a correction holds the clock (`onHold`) until it is shut again, by
 * tapping anywhere else; tapping the other sign swaps one for the other.
 */
export function ClockFrame({
  durationS,
  timer,
  onHold,
  below,
  children,
}: Readonly<{
  /** What sits just under the disc, centred on it. */
  below?: React.ReactNode;
  /** The turn's allotted seconds, or `null` for a table stopwatch. */
  durationS: number | null;
  timer: UseTurnTimer;
  onHold: (hold: boolean) => void;
  children: React.ReactNode;
}>) {
  const [open, setOpen] = useState<1 | -1 | null>(null);
  const readingS = clockReading(durationS, timer.elapsedS);

  function toggle(sign: 1 | -1) {
    const next = open === sign ? null : sign;

    setOpen(next);
    onHold(next !== null);
  }

  function shut() {
    setOpen(null);
    onHold(false);
  }

  return (
    <div className="relative w-fit">
      {children}
      {below ? (
        // Centred without a transform: one would trap the fixed backdrop of
        // a modal opened from in here inside this box.
        <div className="absolute inset-x-0 top-full mt-1 flex justify-center">
          {below}
        </div>
      ) : null}

      {open === null ? null : (
        // A tap anywhere else shuts the steps — and is spent doing so, rather
        // than also landing on whatever it hit, the disc's own pause included.
        <button
          type="button"
          aria-label="Fermer la correction"
          tabIndex={-1}
          onClick={shut}
          className="fixed inset-0 z-20 cursor-default"
        />
      )}

      {([1, -1] as const).map(sign => (
        <ClockNudge
          key={sign}
          sign={sign}
          durationS={durationS}
          readingS={readingS}
          open={open === sign}
          onOpen={() => toggle(sign)}
          onStep={timer.setElapsed}
          edge={sign > 0 ? "top" : "bottom"}
        />
      ))}
    </div>
  );
}
