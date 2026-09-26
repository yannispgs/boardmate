"use client";

import type { AuditEntry } from "@/lib/domain";
import { AuditEntryCard } from "./AuditEntryCard";

/** The history, newest first — the order the database wrote it in. */
export function AuditEntryCardList({
  entries,
}: Readonly<{ entries: AuditEntry[] }>) {
  return (
    <ul className="flex flex-col gap-2">
      {entries.map(entry => (
        <AuditEntryCard key={entry.id} entry={entry} />
      ))}
    </ul>
  );
}
