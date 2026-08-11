"use client";

import { HoldButton } from "@/components/HoldButton";

/**
 * Hands the table over to the next player — or, on the last turn of a
 * fixed-length game, says so instead: there is nothing left to advance to and
 * the points are counted from here.
 *
 * A game played in generations offers a second way out of the turn: passing,
 * which ends the current player's generation. He is skipped until everyone has
 * passed and the next generation opens. Since that cannot be undone, passing
 * takes a **held** press rather than a tap — see {@link HoldButton}.
 */
export function NextTurnControl({
  atFinalTurn,
  disabled,
  onNext,
  onPass,
}: Readonly<{
  atFinalTurn: boolean;
  disabled: boolean;
  onNext: () => void;
  /** Null for a game with no generations, where nobody can pass. */
  onPass: (() => void) | null;
}>) {
  if (atFinalTurn) {
    return (
      <p className="text-center text-sm font-semibold text-amber-600 dark:text-amber-400">
        Dernier tour — terminez la partie pour compter les points.
      </p>
    );
  }

  return (
    // Side by side, "Passe" on the left at a third of the width: it is the way
    // out, not the way on, and the size says so before the label does.
    <div className="flex w-full max-w-sm items-stretch gap-3">
      {onPass === null ? null : (
        <HoldButton
          onHold={onPass}
          disabled={disabled}
          className="flex-1 gap-2 rounded-xl border border-zinc-300 px-3 py-3 text-base font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <span className="flex flex-col items-center leading-tight">
            <span>Passe</span>
            <span className="text-xs font-normal opacity-60">maintenir</span>
          </span>
        </HoldButton>
      )}

      {/* Wrapped, not passed straight through: the click event would otherwise
          land as the handler's first argument. */}
      <button
        type="button"
        onClick={() => onNext()}
        disabled={disabled}
        className="flex-[2] rounded-xl bg-indigo-600 px-6 py-4 text-lg font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
      >
        Tour suivant →
      </button>
    </div>
  );
}
