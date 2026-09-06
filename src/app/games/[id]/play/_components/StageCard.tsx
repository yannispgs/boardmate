"use client";

import type { CSSProperties } from "react";

import { STAGE_HOLD_MS } from "./use-stage-hold";

/** Geometry of the countdown ring — a circle drawn in its own 32-unit box. */
const RADIUS = 14;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * « GÉNÉRATION 4 », « MANCHE 2 » — laid over the play screen when the game moves
 * on to the next stage, and **kept there until somebody taps it**.
 *
 * A stage turns over a handful of times in a party, and the counter that
 * announced it was a line of small text somewhere on the screen: the table
 * routinely found out two turns late that it had moved on. A card that takes
 * the screen is the only thing that catches a table looking at its cards and
 * not at the phone.
 *
 * It is a **step, not an announcement** — the whole point of it, and it was the
 * other way round until the clock was looked at. The new stage's first turn
 * starts running the instant the stage flips, so every second between the flip
 * and the moment the table notices was charged to whoever happened to be first,
 * for a card he had not read yet. The clock is therefore held — frozen, never
 * paused, see {@link ./use-stage-hold} — for as long as this is up, and the tap
 * that dismisses it is what starts the turn.
 *
 * The cost is real and was accepted: this eats one tap. A finger aimed at the
 * board underneath, or at « tour suivant », lands here instead. In exchange
 * nobody is billed for the handover.
 *
 * Nothing here is a turn: a turn changes a hundred times an evening and gets no
 * card, no fade and no beat, because the cost of a transition is how often it
 * is paid.
 */
export function StageCard({
  stage,
  label,
  onDismiss,
}: Readonly<{
  /** The generation now being played. */
  stage: number;
  /** What this game calls one — « Génération », « Manche ». */
  label: string;
  /** Hands the stage to the table: the clock starts on this. */
  onDismiss: () => void;
}>) {
  return (
    // Solid black behind the number, thinning out in every direction but never
    // to nothing: 40 % still at the edges. The whole screen dims, and the eye is
    // pulled to the one place that is darkest — which is where the number is.
    // The board stays readable underneath; it is veiled, not replaced, so the
    // table can check where it had got to before taking the turn.
    <button
      type="button"
      onClick={onDismiss}
      className="stage-card fixed inset-0 z-40 flex cursor-pointer flex-col items-center justify-center bg-[radial-gradient(circle_at_center,rgba(0,0,0,1)_0%,rgba(0,0,0,0.85)_25%,rgba(0,0,0,0.6)_55%,rgba(0,0,0,0.4)_100%)]"
    >
      {/* `output` carries the `status` role on its own — the one name for what
          this is — and it is what a test can hold on to. « Génération 2 » is
          also written in the progress line under the strip, so matching on the
          words alone would find the wrong one half the time. The ring is kept
          outside it so that name stays exactly the two words it announces. */}
      <output className="px-6 text-center text-5xl font-black uppercase leading-tight tracking-wide text-white sm:text-6xl">
        {label} {stage}
      </output>

      {/* What is left of the wait. The clock does not hang on this tap for ever
          — that would trade billing the first player for a few seconds against
          billing him for none at all — so the ring drains, and the turn starts
          by itself once it is empty. Showing it is what keeps the ceiling from
          being a surprise: the table can see the screen is about to hand over. */}
      <svg
        viewBox="0 0 32 32"
        className="mt-8 h-8 w-8 -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={16}
          cy={16}
          r={RADIUS}
          fill="none"
          strokeWidth={2.5}
          className="stroke-white/25"
        />

        <circle
          cx={16}
          cy={16}
          r={RADIUS}
          fill="none"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          className="stage-ring stroke-white/80"
          style={
            {
              animationDuration: `${STAGE_HOLD_MS}ms`,
              // One source of truth for the circumference: the keyframe empties
              // the stroke by exactly the length the dash array laid down.
              "--stage-ring-length": `${CIRCUMFERENCE}`,
            } as CSSProperties
          }
        />
      </svg>
    </button>
  );
}
