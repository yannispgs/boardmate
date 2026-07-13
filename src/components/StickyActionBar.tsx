import type { ReactNode } from "react";

/**
 * The fixed bottom action bar of a list screen (its "Nouveau X" action). Sits
 * below the scrolling item list as a non-scrolling footer, so the action is
 * always reachable without scrolling to the end. The negative horizontal margin
 * cancels the page's `px-6` so the bar's background and top border run edge to
 * edge of the content column.
 */
export function StickyActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-6 flex flex-col gap-2 border-t border-black/10 bg-[var(--background)] px-6 pt-3 pb-6 dark:border-white/10">
      {children}
    </div>
  );
}
