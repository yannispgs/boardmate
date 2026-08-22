"use client";

import type { DraftDirection } from "@/lib/domain";
import { DRAFT_LABEL } from "@/lib/game/phase";

/**
 * Which way the cards go round during a drafted draw.
 *
 * The direction alternates from one generation to the next, which is exactly
 * the thing a table stops agreeing on by the third one — so it is stated in
 * full at the head of the phase, not left to a symbol somebody has to remember
 * the meaning of. Shown only when the game was actually configured to draft.
 */
export function DraftBanner({
  direction,
}: Readonly<{ direction: DraftDirection }>) {
  return (
    <p className="flex w-full max-w-sm items-center justify-center gap-2 rounded-xl bg-sky-100 px-4 py-2 text-center text-sm font-semibold text-sky-900 dark:bg-sky-950 dark:text-sky-200">
      <span aria-hidden className="text-lg leading-none">
        {direction === "left" ? "←" : "→"}
      </span>
      Draft : passez vos cartes {DRAFT_LABEL[direction]}
    </p>
  );
}
