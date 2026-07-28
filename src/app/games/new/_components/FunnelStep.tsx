"use client";

import { StickyActionBar } from "@/components/StickyActionBar";

/**
 * One screen of the funnel: a fixed heading, a body that scrolls on its own,
 * and — when the step gives one — a footer pinned to the bottom of the screen,
 * so a long list never pushes the step's action out of reach.
 */
export function FunnelStep({
  title,
  children,
  onBack,
  footer,
}: {
  title: string;
  children: React.ReactNode;
  onBack?: () => void;
  footer?: React.ReactNode;
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          {title}
        </h2>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            ← Retour
          </button>
        ) : null}
      </div>

      {/* Scrolling on one axis clips the other too, which would shave the ring
          off a selected card at the left, right and top edges. The padding
          gives the ring room and the negative margin puts the content back
          where it was, flush with the page's column. */}
      <div className="-mx-1 -mt-1 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1 pt-1 pb-6">
        {children}
      </div>

      {footer ? <StickyActionBar>{footer}</StickyActionBar> : null}
    </section>
  );
}
