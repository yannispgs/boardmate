"use client";

import type { ReactNode } from "react";

/**
 * A read-only « attribute → value » card.
 *
 * Extracted from the funnel's launch recap so the confirmation that deals the
 * next party can say the same things the same way. The two are read a minute
 * apart by the same table, and a recap that changes shape between the launch
 * and the next deal reads as a different set of facts.
 */
export function SummaryList({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <dl className="flex flex-col gap-2 rounded-xl border border-black/10 bg-black/[0.02] p-4 text-sm dark:border-white/10 dark:bg-white/[0.02]">
      {children}
    </dl>
  );
}

/**
 * One line of it. The value is right-aligned so a long one wraps against the
 * label rather than under it.
 */
export function SummaryRow({
  label,
  children,
}: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}
