"use client";

import { useState } from "react";

import { sectionHeadingClass } from "@/components/ui";
import type { AuditAction, AuditEntry } from "@/lib/domain";
import {
  auditActionLabel,
  auditChanges,
  auditEntryTitle,
  formatAuditValue,
} from "@/lib/domain";

/** The three actions, coloured by how much they take away. */
const ACTION_CLASSES: Readonly<Record<AuditAction, string>> = {
  insert: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  update: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  delete: "bg-red-500/10 text-red-700 dark:text-red-300",
};

const badgeClass = "rounded-full px-2 py-0.5 text-xs font-medium";

/** What the disclosure offers, which is how many fields are behind it. */
function detailLabel(count: number): string {
  return `Détail · ${count} champ${count > 1 ? "s" : ""}`;
}

/**
 * One line of the history, opening on what changed.
 *
 * Formatted in the browser and nowhere else: the server runs in UTC, so a date
 * rendered server-side would show the UTC day for one paint and flip on
 * hydration.
 */
export function AuditEntryCard({ entry }: Readonly<{ entry: AuditEntry }>) {
  const [open, setOpen] = useState(false);
  const changes = auditChanges(entry);
  const when = new Date(entry.occurredAt).toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`${badgeClass} ${ACTION_CLASSES[entry.action]}`}>
          {auditActionLabel(entry.action)}
        </span>
        <span className="min-w-0 flex-1 truncate font-medium">
          {auditEntryTitle(entry)}
        </span>
        <span className="shrink-0 text-xs text-zinc-500">{when}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
        <span>
          {entry.actorEmail ?? "Hors session"}
          {entry.actorRoles.length === 0
            ? null
            : ` · ${entry.actorRoles.join(", ")}`}
        </span>

        {/* Two badges that change how the line reads, so they sit beside the
            name rather than inside the detail: a write nobody signed for, and
            one made while looking through somebody else's rights. */}
        {entry.channel === "out-of-session" ? (
          <span
            title="Écrit hors d'une session : une migration, ou une requête passée à la main"
            className={`${badgeClass} bg-zinc-500/10 text-zinc-600 dark:text-zinc-300`}
          >
            Hors session
          </span>
        ) : null}
        {entry.simulated ? (
          <span
            title="L'auteur regardait l'application à travers un rôle simulé"
            className={`${badgeClass} bg-indigo-500/10 text-indigo-700 dark:text-indigo-300`}
          >
            Rôle simulé
          </span>
        ) : null}
      </div>

      {changes.length === 0 ? null : (
        <button
          type="button"
          onClick={() => setOpen(current => !current)}
          className="self-start text-xs font-medium text-indigo-600 transition hover:text-indigo-500 dark:text-indigo-400"
        >
          {open ? "Masquer le détail" : detailLabel(changes.length)}
        </button>
      )}

      {open ? (
        <dl className="flex flex-col gap-2 border-t border-black/5 pt-2 text-xs dark:border-white/10">
          {changes.map(change => (
            <div key={change.column} className="flex flex-col gap-0.5">
              <dt className={sectionHeadingClass}>{change.label}</dt>
              <dd className="flex flex-col gap-0.5 break-all">
                <span className="text-zinc-500 line-through">
                  {formatAuditValue(change.before)}
                </span>
                <span>{formatAuditValue(change.after)}</span>
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </li>
  );
}
