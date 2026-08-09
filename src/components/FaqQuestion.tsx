"use client";

import type { ReactNode } from "react";

import { ChevronRightIcon } from "@/components/icons";
import type { FaqEntry } from "@/lib/domain";

/**
 * One question, closed until it is asked. The answer appears when the card
 * unfolds — on a phone there is no hovering to reveal it with, and a list of
 * questions is easier to run down when nothing but the questions is on screen.
 *
 * The answer is rendered as plain text (`whitespace-pre-wrap` keeps the line
 * breaks) — never as HTML. It is stored exactly as it was typed, so anything
 * else would turn the FAQ into a stored-XSS vector.
 *
 * `actions` is what may be done to the entry, shown under the answer once it is
 * open: the FAQ screen fills it, a game being played leaves it out and reads.
 */
export function FaqQuestion({
  entry,
  actions,
}: Readonly<{
  entry: FaqEntry;
  actions?: ReactNode;
}>) {
  return (
    <li className="rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-900">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-start gap-2 p-3">
          <ChevronRightIcon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-90" />
          <span className="flex-1 text-sm font-medium">{entry.question}</span>
        </summary>

        <div className="flex flex-col gap-3 border-t border-black/5 px-3 py-3 dark:border-white/10">
          <p className="whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-300">
            {entry.answer}
          </p>

          {actions}
        </div>
      </details>
    </li>
  );
}
