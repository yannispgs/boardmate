/** Seconds left when the countdown starts beeping. */
export const BEEP_FROM = 10;

/** What the countdown has to announce between two readings of the clock. */
export type CountdownCue = "beep" | "ring" | null;

/**
 * What to play, given where the clock stood at the previous reading and where
 * it stands now.
 *
 * Deliberately a *crossing* and not an equality: the turn clock is driven by a
 * `setInterval`, which a phone freezes the moment the screen locks or the app
 * goes to the background. On the way back the clock snaps straight to the real
 * elapsed time, so a reading can jump from 40 seconds left to 3 — every exact
 * second in between, the ten beeps and the zero, would go unsaid.
 *
 * One cue per reading, never one per second skipped: after a stall we want a
 * beep, not a burst of eight.
 */
export function countdownCue(
  /** Seconds left at the previous reading, `null` at the first one of a turn. */
  previousS: number | null,
  remainingS: number,
): CountdownCue {
  // Nothing was crossed: the first reading of a turn, a re-reading at the same
  // instant (pausing and resuming), or time given back by raising the duration.
  if (previousS === null || remainingS >= previousS) {
    return null;
  }

  if (remainingS <= 0 && previousS > 0) {
    return "ring";
  }

  if (remainingS >= 1 && remainingS <= BEEP_FROM) {
    return "beep";
  }

  return null;
}
