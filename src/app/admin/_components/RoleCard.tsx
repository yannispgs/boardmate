"use client";

import { groupBySection, type Permission, type Role } from "@/lib/domain";

/**
 * One role, and what it opens. An administrator role is shown as holding
 * everything without listing it: that is literally how the database answers,
 * and a list would go stale the day a permission is added.
 */
export function RoleCard({
  role,
  permissions,
}: Readonly<{ role: Role; permissions: Permission[] }>) {
  const granted = permissions.filter(permission =>
    role.permissionKeys.includes(permission.key),
  );

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
        </div>
      </div>

      {role.isAdmin ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Toutes les permissions, y compris celles ajoutées plus tard. Ni ce
          rôle ni son attribution ne se retirent depuis l&apos;application.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {granted.length === 0
              ? "Aucune permission pour l'instant."
              : `${granted.length} permission${granted.length > 1 ? "s" : ""}`}
          </span>

          {granted.length === 0 ? null : (
            <ul className="flex flex-wrap gap-1.5">
              {groupBySection(granted).map(section => (
                <li
                  key={section.name}
                  className="rounded-full border border-black/10 px-2 py-0.5 text-xs dark:border-white/15"
                >
                  {section.name} · {section.permissions.length}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}
