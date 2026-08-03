"use client";

import { FaqQuestion } from "@/components/FaqQuestion";
import { sectionHeadingClass } from "@/components/ui";
import type { FaqEntry } from "@/lib/domain";

/**
 * One titled block of the FAQ read during a game — the questions of the game
 * itself, or of one extension on the table. Read-only: mid-game is no moment to
 * be rewriting the rules, that is what the FAQ screen is for.
 */
export function FaqSection({
  title,
  entries,
}: Readonly<{
  title: string;
  entries: FaqEntry[];
}>) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className={sectionHeadingClass}>{title}</h3>

      <ul className="flex flex-col gap-2">
        {entries.map(entry => (
          <FaqQuestion key={entry.id} entry={entry} />
        ))}
      </ul>
    </section>
  );
}
