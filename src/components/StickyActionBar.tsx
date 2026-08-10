import type { ReactNode } from "react";

/**
 * The bottom action bar of a screen (its "Nouveau X" action), always reachable
 * without scrolling to the end: it is the non-scrolling footer of a screen whose
 * list scrolls on its own, and sticks to the bottom of the viewport on a screen
 * that scrolls as a whole document. The negative horizontal margin cancels the
 * page's `px-6` so the bar's background and top border run edge to edge of the
 * content column.
 */
export function StickyActionBar({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <div className="sticky bottom-0 z-10 -mx-6 flex flex-col gap-2 border-t border-black/10 bg-[var(--background)] px-6 pt-3 pb-6 dark:border-white/10">
      {children}
    </div>
  );
}
