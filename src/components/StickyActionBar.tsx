import type { ReactNode } from "react";

/**
 * A bottom action bar for a list screen (its "Nouveau X" action). It stays
 * pinned to the bottom of the viewport while the list scrolls behind it
 * (`sticky bottom-0`), so the action is always reachable without scrolling to
 * the very end; when the list is short it simply sits below it. The negative
 * horizontal margin cancels the page's `px-6` so the bar's background runs edge
 * to edge of the content column.
 */
export function StickyActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-6 mt-2 flex flex-col gap-2 border-t border-black/10 bg-white/85 px-6 pb-5 pt-3 backdrop-blur dark:border-white/10 dark:bg-zinc-950/85">
      {children}
    </div>
  );
}
