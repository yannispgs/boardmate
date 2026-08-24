"use client";

import { useState } from "react";

import { ErrorText } from "@/components/ErrorText";
import { Modal } from "@/components/Modal";
import { ModalHeader } from "@/components/ModalHeader";
import { fieldClass, modalCardClass } from "@/components/ui";
import { formatDuration } from "@/lib/game/format-time";
import {
  CLOCK_STEPS_S,
  clockReading,
  elapsedForReading,
  formatClockInput,
  parseClock,
} from "@/lib/game/turn-clock";
import type { UseTurnTimer } from "@/lib/hooks/use-turn-timer";

/** A step as it reads on its button: "10 s", "30 s", "1 min". */
function stepLabel(seconds: number): string {
  return seconds < 60 ? `${seconds} s` : `${seconds / 60} min`;
}

/** One of the two lines: the clock as it stands, and as it will read. */
function Readout({
  label,
  readingS,
}: Readonly<{ label: string; readingS: number }>) {
  // Only a countdown ever goes negative; a stopwatch is floored at nought.
  const overtime = readingS < 0;

  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-sm text-zinc-500 dark:text-zinc-400">{label}</span>
      <span
        className={`text-lg font-semibold tabular-nums ${
          overtime ? "text-red-600 dark:text-red-400" : ""
        }`}
      >
        {overtime
          ? `+${formatDuration(-readingS)} de dépassement`
          : formatDuration(readingS)}
      </span>
    </div>
  );
}

/**
 * Puts the clock the table is watching back where it should have been — nobody
 * advanced the turn, nobody closed the phase, nobody paused while the box was
 * being searched. It moves the *time played*, so what is recorded is corrected
 * too, not just what is displayed: a turn's duration, or the seconds a phase
 * banks when it closes.
 *
 * It serves both clocks because both are wrong the same way. `durationS` is the
 * turn's allotted time, or `null` for a phase run on the table's stopwatch —
 * which is corrected on the time it has *run* rather than on what it has left,
 * nothing having been allotted for it to count down from.
 *
 * Opening the sheet freezes the clock (see `setFrozen`): the figures being read
 * would otherwise drift while they are being read, and the correction would
 * land one reading late. Closing it releases the hold, which resumes the clock
 * only if it was running to begin with.
 */
export function TimerAdjust({
  durationS,
  timer,
}: Readonly<{ durationS: number | null; timer: UseTurnTimer }>) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  const countdown = durationS !== null;
  const title = countdown
    ? "Corriger le temps restant"
    : "Corriger le temps écoulé";
  const readingS = clockReading(durationS, timer.elapsedS);
  const target = parseClock(value);

  /** A typed or stepped time, as the clock will actually end up reading it. */
  function settled(reading: number): number {
    return clockReading(durationS, elapsedForReading(durationS, reading));
  }

  function start() {
    timer.setFrozen(true);
    setValue(formatClockInput(readingS));
    setOpen(true);
  }

  function close() {
    timer.setFrozen(false);
    setOpen(false);
  }

  // Stepping offers what the clock can really be set to, so a stopwatch stepped
  // below zero stops at zero rather than proposing a time nobody can have
  // played, and a countdown stepped past its start stops at full.
  function step(deltaS: number) {
    setValue(formatClockInput(settled((target ?? readingS) + deltaS)));
  }

  function apply() {
    if (target !== null) {
      timer.setElapsed(elapsedForReading(durationS, target));
    }

    close();
  }

  return (
    <>
      <button
        type="button"
        onClick={start}
        className="text-sm text-zinc-500 underline-offset-2 hover:underline"
      >
        {title}
      </button>

      {open ? (
        <Modal
          onClose={close}
          label={title}
          className={`${modalCardClass} max-w-sm`}
        >
          <ModalHeader
            title={title}
            hint="Le chronomètre est en attente, il repart en fermant."
            onClose={close}
          />

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
            <Readout label="Maintenant" readingS={readingS} />

            {/* Signs read on the clock, not on the time played: « + 30 s »
                means the turn shows thirty seconds more to play — and, on a
                stopwatch, thirty seconds more on the phase. */}
            <div className="grid grid-cols-3 gap-2">
              {CLOCK_STEPS_S.map(s => (
                <button
                  key={`minus-${s}`}
                  type="button"
                  aria-label={`Retirer ${stepLabel(s)}`}
                  onClick={() => step(-s)}
                  className="rounded-lg border border-black/10 py-2 text-sm font-medium tabular-nums transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
                >
                  −{stepLabel(s)}
                </button>
              ))}
              {CLOCK_STEPS_S.map(s => (
                <button
                  key={`plus-${s}`}
                  type="button"
                  aria-label={`Ajouter ${stepLabel(s)}`}
                  onClick={() => step(s)}
                  className="rounded-lg border border-black/10 py-2 text-sm font-medium tabular-nums transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
                >
                  +{stepLabel(s)}
                </button>
              ))}
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Temps exact
              </span>
              <input
                type="text"
                value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    apply();
                  }
                }}
                aria-label={countdown ? "Temps restant" : "Temps écoulé"}
                className={`${fieldClass} bg-transparent tabular-nums outline-none focus:border-indigo-500`}
              />
            </label>

            {target === null ? (
              <ErrorText
                message={
                  countdown
                    ? "Format attendu : 1:30, 90, ou -0:20 pour un dépassement."
                    : "Format attendu : 1:30 ou 90."
                }
              />
            ) : (
              <Readout label="Après correction" readingS={settled(target)} />
            )}
          </div>

          <div className="flex gap-2 border-t border-black/10 p-4 dark:border-white/10">
            <button
              type="button"
              onClick={close}
              className="flex-1 rounded-lg border border-black/10 px-4 py-2.5 font-medium transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={target === null}
              onClick={apply}
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
            >
              Appliquer
            </button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
