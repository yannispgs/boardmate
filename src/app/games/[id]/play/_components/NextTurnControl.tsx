"use client";

/**
 * Hands the table over to the next player — or, on the last turn of a
 * fixed-length game, says so instead: there is nothing left to advance to and
 * the points are counted from here.
 *
 * A game played in generations offers a second way out of the turn: passing,
 * which ends the current player's generation. He is skipped until everyone has
 * passed and the next generation opens.
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
    <div className="flex w-full max-w-xs flex-col gap-3">
      {/* Wrapped, not passed straight through: the click event would otherwise
          land as the handler's first argument. */}
      <button
        type="button"
        onClick={() => onNext()}
        disabled={disabled}
        className="w-full rounded-xl bg-indigo-600 px-6 py-4 text-lg font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
      >
        Tour suivant →
      </button>

      {onPass === null ? null : (
        <button
          type="button"
          onClick={() => onPass()}
          disabled={disabled}
          className="w-full rounded-xl border border-zinc-300 px-6 py-3 text-base font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Passe
        </button>
      )}
    </div>
  );
}
