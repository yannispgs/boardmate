"use client";

/**
 * What closes the score sheet the reveal handed over to — the same button on
 * both sheets, since it does the same thing whichever one the game is scored
 * on: the sheet is the last thing the table reads with the cards still out,
 * and behind it waits the finished party's own screen.
 *
 * Absent when the sheet is embedded rather than read on its way out (the final
 * score panel), which is why it takes the handler at all.
 */
export function SheetDoneButton({ onDone }: Readonly<{ onDone?: () => void }>) {
  if (onDone === undefined) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onDone}
      className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-500"
    >
      Continuer
    </button>
  );
}
