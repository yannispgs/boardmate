"use client";

/**
 * The objective is reached but the game is still running: at Splendor the lap is
 * played out so everybody has had the same number of turns. Without this the
 * table would have no idea the app is holding an ending it can already see —
 * and the players still to play would not know this is their last chance.
 */
export function LastLapBanner({ shown }: Readonly<{ shown: boolean }>) {
  if (!shown) {
    return null;
  }

  return (
    <div className="flex w-full max-w-sm items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/[0.06] p-3 text-sm">
      <span aria-hidden>🏁</span>
      <span>
        <span className="font-semibold">Dernier tour de table</span>&nbsp;—
        l&apos;objectif est atteint, chacun termine son tour.
      </span>
    </div>
  );
}
