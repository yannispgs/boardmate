"use client";

import { ChevronRightIcon, PencilIcon, TrashIcon } from "@/components/icons";
import { dangerIconButtonClass, iconButtonClass } from "@/components/ui";
import {
  groupBySection,
  type Permission,
  type Role,
  roleDeleteBlocker,
  roleGrants,
} from "@/lib/domain";

/** How much a role hands out, in words — « rien » is worth saying outright. */
function held(count: number): string {
  if (count === 0) {
    return "Aucune permission pour l'instant.";
  }

  return `Permissions (${count})`;
}

/**
 * One role, and exactly which permissions it hands out — this tab is where that
 * question is answered, so the keys are listed here rather than repeated on
 * every line of the catalogue.
 *
 * An administrator role is shown as holding everything without listing it: that
 * is literally how the database answers, and a list would go stale the day a
 * permission is added.
 */
export function RoleCard({
  role,
  permissions,
  onEdit,
  onDelete,
}: Readonly<{
  role: Role;
  permissions: Permission[];
  /** Omitted when the reader may not compose roles: the card is then read-only. */
  onEdit?: (role: Role) => void;
  onDelete?: (role: Role) => void;
}>) {
  const granted = permissions.filter(permission =>
    roleGrants(role, permission.key),
  );
  // Written under the buttons, not hidden in a tooltip: on a phone there is no
  // hover, and « pourquoi ce bouton est-il grisé » deserves an answer in sight.
  const blocker = roleDeleteBlocker(role);

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-900">
      {/* The name takes the width it needs and the buttons keep theirs: without
          `min-w-0` a long role name pushes them out past the card's edge, which
          on a phone puts them off-screen entirely. */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-medium">{role.label}</span>
          <code className="text-xs text-zinc-400">{role.key}</code>
        </div>

        {onEdit || onDelete ? (
          <div className="flex shrink-0 gap-1.5">
            {onEdit ? (
              <button
                type="button"
                onClick={() => onEdit(role)}
                aria-label={`Modifier ${role.label}`}
                className={iconButtonClass}
              >
                <PencilIcon />
              </button>
            ) : null}

            {onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(role)}
                disabled={blocker !== null}
                aria-label={`Supprimer ${role.label}`}
                className={`${dangerIconButtonClass} disabled:opacity-40`}
              >
                <TrashIcon />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {role.description !== null ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          {role.description}
        </p>
      ) : null}

      {/* Badges sit on their own line now: crammed in beside the buttons they
          were the thing that overflowed, and they are the least urgent part. */}
      {role.isAdmin || role.isSystem ? (
        <div className="flex flex-wrap gap-1.5">
          {role.isAdmin ? (
            <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">
              Administrateur
            </span>
          ) : null}
          {role.isSystem ? (
            <span className="rounded-full border border-black/10 px-2 py-0.5 text-xs text-zinc-500 dark:border-white/15 dark:text-zinc-400">
              Fourni par l&apos;app
            </span>
          ) : null}
        </div>
      ) : null}

      {onDelete && blocker !== null ? (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {blocker}
        </span>
      ) : null}

      {role.isAdmin ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Toutes les permissions, y compris celles ajoutées plus tard. Ni ce
          rôle ni son attribution ne se retirent depuis l&apos;application.
        </p>
      ) : (
        <RolePermissions permissions={granted} summary={held(granted.length)} />
      )}
    </li>
  );
}

/**
 * What the role hands out, folded away. Open, it is one key per line under its
 * section: a key is what a policy names, so it is read by scanning down the
 * list for one — which a run-on sentence of comma-separated keys makes slow,
 * and a wall of framed chips makes loud.
 */
function RolePermissions({
  permissions,
  summary,
}: Readonly<{ permissions: Permission[]; summary: string }>) {
  if (permissions.length === 0) {
    return (
      <span className="text-sm text-zinc-500 dark:text-zinc-400">
        {summary}
      </span>
    );
  }

  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center gap-2">
        <ChevronRightIcon className="h-4 w-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-90" />
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {summary}
        </span>
      </summary>

      <div className="flex flex-col gap-2 pt-2 pl-6">
        {groupBySection(permissions).map(section => (
          <div key={section.name} className="flex flex-col gap-0.5">
            <span className="text-xs text-zinc-400">{section.name}</span>

            <ul className="flex flex-col text-xs break-words text-zinc-600 dark:text-zinc-300">
              {section.permissions.map(permission => (
                <li key={permission.key}>{permission.key}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}
