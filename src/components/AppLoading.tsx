import { BoardmateLogo } from "./BoardmateLogo";

/**
 * What the application shows while it is still coming up: on a cold start it is
 * the first thing painted, right after the launch image the phone put up on its
 * own, so the wait finally says something instead of staying blank.
 *
 * It fades in on a delay (`splash-in`), which is what keeps it from flashing
 * past on the way back to a screen that was only ever a third of a second away:
 * under that, nothing but the page background is ever painted.
 */
export function AppLoading() {
  return (
    <div className="splash-in flex flex-1 flex-col items-center justify-center gap-5">
      {/* The die itself is the waiting signal — a second spinner beside it
          would only be two things turning at two different speeds. */}
      <BoardmateLogo className="dice-roll h-20 w-20" />

      <span className="text-xl font-semibold tracking-tight">Boardmate</span>

      <span className="text-sm text-zinc-500 dark:text-zinc-400">
        Chargement…
      </span>
    </div>
  );
}
