"use client";

/**
 * Hands the table over to the next player — or, on the last turn of a
 * fixed-length game, says so instead: there is nothing left to advance to and
 * the points are counted from here.
 */
export function NextTurnControl({
  atFinalTurn,
  disabled,
  onNext,
}: Readonly<{
  atFinalTurn: boolean;
  disabled: boolean;
  onNext: () => void;
}>) {
  if (atFinalTurn) {
    return (
      <p className="text-center text-sm font-semibold text-amber-600 dark:text-amber-400">
        Dernier tour — terminez la partie pour compter les points.
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={onNext}
      disabled={disabled}
      className="w-full max-w-xs rounded-xl bg-indigo-600 px-6 py-4 text-lg font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
    >
      Tour suivant →
    </button>
  );
}
