"use client";

import { useChangeBeat } from "./use-change-beat";

/** In 200 ms, held 800, out 400 — the envelope of the `stage-card` keyframes. */
const BEAT_MS = 1400;

/**
 * « GÉNÉRATION 4 », laid over the play screen for a beat when the game moves on
 * to the next one.
 *
 * A generation turns over about eight times in a party, and the counter that
 * announced it was a line of small text somewhere on the screen: the table
 * routinely found out two turns late that it had moved on. A card that takes
 * the screen for a second and a half is the only thing that catches a table
 * looking at its cards and not at the phone. The board stays readable
 * underneath, veiled rather than hidden — nobody has to wait for it to go.
 *
 * Nothing here is a turn: a turn changes a hundred times an evening and gets no
 * card, no fade and no beat, because the cost of a transition is how often it
 * is paid.
 */
export function StageCard({
  stage,
  label,
}: Readonly<{
  /** The generation now being played. */
  stage: number;
  /** What this game calls one — « Génération », « Manche ». */
  label: string;
}>) {
  const showing = useChangeBeat(stage, BEAT_MS);

  if (!showing) {
    return null;
  }

  return (
    // Click-through on purpose: it is an announcement, not a step. A table that
    // has already seen it must not have to dismiss it, and a tap aimed at the
    // board underneath must land on the board.
    // `status` is the one role that names it for what it is — an announcement
    // that arrives and leaves on its own — and it is what a test can hold on to.
    // « Génération 2 » is also written in the progress line under the strip, so
    // matching on the words alone would find the wrong one half the time.
    <div
      role="status"
      className="stage-card pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-black/40"
    >
      <p className="rounded-2xl bg-white/95 px-8 py-6 text-center text-2xl font-bold uppercase tracking-wide text-zinc-900 shadow-2xl dark:bg-zinc-900/95 dark:text-zinc-50">
        {label} {stage}
      </p>
    </div>
  );
}
