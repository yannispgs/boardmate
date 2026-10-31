import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The heading every full-screen list opens on: the title, a line saying what
 * the screen is for, and — top right, level with the title — room for the one
 * control that acts on the whole screen (a magnifying glass, a funnel). It does
 * not scroll: only the list underneath does. A way back is drawn only for a
 * screen nested under another: the tab bar already leads everywhere else.
 */
export function ScreenHeader({
  title,
  description,
  backHref,
  backLabel,
  action,
  children,
}: Readonly<{
  title: string;
  description?: ReactNode;
  /** The screen this one is nested under, with its « ← … » label. */
  backHref?: string;
  backLabel?: string;
  /** The screen-wide control, shown level with the title. */
  action?: ReactNode;
  /** Anything unfolding under the heading, e.g. a search field. */
  children?: ReactNode;
}>) {
  return (
    <header className="flex shrink-0 flex-col gap-1 pt-10 pb-4">
      {backHref === undefined ? null : (
        <Link
          href={backHref}
          className="text-sm text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          {backLabel}
        </Link>
      )}

      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {action}
      </div>

      {description === undefined ? null : (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      )}

      {children}
    </header>
  );
}
