"use client";

import { fieldClass } from "@/components/ui";
import type { AuditAction, AuditEntry, AuditFilter } from "@/lib/domain";
import { auditActionLabel, auditResourceLabel } from "@/lib/domain";

const ACTIONS: AuditAction[] = ["insert", "update", "delete"];

/**
 * Narrows the history: by resource, by action, by author.
 *
 * The resource and author lists are built from the entries already read rather
 * than from the catalogue of every table there is — offering « Gabarit de
 * configuration » when nobody has ever touched one leads to an empty list and
 * teaches nothing.
 */
export function AuditFilters({
  entries,
  filter,
  onChange,
}: Readonly<{
  entries: AuditEntry[];
  filter: AuditFilter;
  onChange: (filter: AuditFilter) => void;
}>) {
  const tables = [...new Set(entries.map(entry => entry.tableName))].sort(
    (a, b) => auditResourceLabel(a).localeCompare(auditResourceLabel(b), "fr"),
  );
  const authors = [
    ...new Map(
      entries
        .filter(entry => entry.actorId !== null)
        .map(entry => [entry.actorId, entry.actorEmail ?? entry.actorId]),
    ),
  ].sort((a, b) => String(a[1]).localeCompare(String(b[1]), "fr"));

  return (
    <div className="flex flex-wrap gap-2">
      <select
        value={filter.tableName ?? ""}
        onChange={event =>
          onChange({
            ...filter,
            tableName:
              event.target.value === "" ? undefined : event.target.value,
          })
        }
        aria-label="Ressource"
        className={fieldClass}
      >
        <option value="">Toutes les ressources</option>
        {tables.map(table => (
          <option key={table} value={table}>
            {auditResourceLabel(table)}
          </option>
        ))}
      </select>

      <select
        value={filter.action ?? ""}
        onChange={event =>
          onChange({
            ...filter,
            action:
              event.target.value === ""
                ? undefined
                : (event.target.value as AuditAction),
          })
        }
        aria-label="Action"
        className={fieldClass}
      >
        <option value="">Toutes les actions</option>
        {ACTIONS.map(action => (
          <option key={action} value={action}>
            {auditActionLabel(action)}
          </option>
        ))}
      </select>

      {/* Left out entirely while nobody signed for anything: a list of one
          empty choice is a control that cannot be used. */}
      {authors.length === 0 ? null : (
        <select
          value={filter.actorId ?? ""}
          onChange={event =>
            onChange({
              ...filter,
              actorId:
                event.target.value === ""
                  ? undefined
                  : (event.target.value as AuditFilter["actorId"]),
            })
          }
          aria-label="Auteur"
          className={fieldClass}
        >
          <option value="">Tous les auteurs</option>
          {authors.map(([id, email]) => (
            <option key={id} value={id ?? ""}>
              {email}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
