"use client";

import { useChangeBeat } from "./use-change-beat";

/** In 500 ms, held 800, out 700 — the envelope of the `stage-card` keyframes. */
const BEAT_MS = 2000;

/**
 * « GÉNÉRATION 4 », « MANCHE 2 » — laid over the play screen for a beat when the
 * game moves on to the next stage.
 *
 * A stage turns over a handful of times in a party, and the counter that
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
    // `output` carries the `status` role on its own — the one name for what
    // this is, an announcement that arrives and leaves without being asked —
    // and it is what a test can hold on to. « Génération 2 » is also written in
    // the progress line under the strip, so matching on the words alone would
    // find the wrong one half the time.
    // Solid black behind the number, thinning out in every direction but never
    // to nothing: 40 % still at the edges. The whole screen dims, and the eye
    // is pulled to the one place that is darkest — which is where the number is.
    <output className="stage-card pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(0,0,0,1)_0%,rgba(0,0,0,0.85)_25%,rgba(0,0,0,0.6)_55%,rgba(0,0,0,0.4)_100%)]">
      {/* White in both themes: the gradient it sits on is dark either way. */}
      <p className="px-6 text-center text-5xl font-black uppercase leading-tight tracking-wide text-white sm:text-6xl">
        {label} {stage}
      </p>
    </output>
  );
}
