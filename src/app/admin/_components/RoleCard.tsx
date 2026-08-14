"use client";

import { PencilIcon, TrashIcon } from "@/components/icons";
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

  return `${count} permission${count > 1 ? "s" : ""}`;
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
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{role.label}</span>
          <code className="text-xs text-zinc-400">{role.key}</code>
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
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
      </div>

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
        <div className="flex flex-col gap-2">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {held(granted.length)}
          </span>

          {groupBySection(granted).map(section => (
            <div key={section.name} className="flex flex-col gap-1">
              <span className="text-xs text-zinc-400">{section.name}</span>

              <ul className="flex flex-wrap gap-1.5">
                {section.permissions.map(permission => (
                  <li
                    key={permission.key}
                    className="rounded-full border border-black/10 px-2 py-0.5 dark:border-white/15"
                  >
                    <code className="text-xs">{permission.key}</code>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </li>
  );
}
