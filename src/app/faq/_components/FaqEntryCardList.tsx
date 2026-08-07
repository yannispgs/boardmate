"use client";

import { sectionHeadingClass } from "@/components/ui";
import type { FaqEntry } from "@/lib/domain";
import { FaqEntryCard } from "./FaqEntryCard";

/**
 * One titled section of the FAQ — the questions of a game, of an extension, or
 * of Boardmate itself. The heading sticks so a long answer never leaves the
 * reader wondering which rulebook they are in.
 */
export function FaqEntryCardList({
  title,
  entries,
  onEdit,
  onDelete,
  onMove,
}: Readonly<{
  title: string;
  entries: FaqEntry[];
  onEdit: (entry: FaqEntry) => void;
  onDelete: (entry: FaqEntry) => void;
  /** Omitted while searching — reordering across sections means nothing. */
  onMove?: (entry: FaqEntry, direction: "up" | "down") => void;
}>) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col">
      <h2
        className={`sticky top-0 z-10 bg-[var(--background)] pt-1 pb-2 ${sectionHeadingClass}`}
      >
        {title} · {entries.length}
      </h2>

      <ul className="flex flex-col gap-2">
        {entries.map((entry, index) => (
          <FaqEntryCard
            key={entry.id}
            entry={entry}
            onEdit={onEdit}
            onDelete={onDelete}
            onMove={onMove}
            canMoveUp={index > 0}
            canMoveDown={index < entries.length - 1}
          />
        ))}
      </ul>
    </section>
  );
}
