"use client";

import type { UseTurnTimer } from "@/lib/hooks/use-turn-timer";
import { DurationEditor } from "./DurationEditor";
import { TimerAdjust } from "./TimerAdjust";

/**
 * The two ways the clock the table is watching is set by hand: how long a turn
 * lasts, and where the clock actually stands.
 *
 * A phase run on the table's stopwatch has nothing allotted, so only the
 * correction applies to it — and it applies for the same reason as on a turn:
 * what the phase banks when it closes is the time the stopwatch was left on.
 */
export function ClockControls({
  countdown,
  durationS,
  onDuration,
  timer,
}: Readonly<{
  /** Whether the clock being set is the per-player countdown. */
  countdown: boolean;
  /** The turn's allotted seconds; read only when there is a countdown. */
  durationS: number;
  onDuration: (seconds: number) => void;
  timer: UseTurnTimer;
}>) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
      {countdown ? (
        <DurationEditor
          durationS={durationS}
          onChange={onDuration}
          onPause={timer.pause}
        />
      ) : null}

      <TimerAdjust durationS={countdown ? durationS : null} timer={timer} />
    </div>
  );
}
