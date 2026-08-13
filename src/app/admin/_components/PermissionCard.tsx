"use client";

import type { Permission, PermissionAction } from "@/lib/domain";

const ACTION_LABELS: Record<PermissionAction, string> = {
  create: "Créer",
  read: "Lire",
  update: "Modifier",
  delete: "Supprimer",
};

// Read is the harmless one and deletion the one you don't undo; the colours say
// so at a glance, which is the whole point of a grid you scan before granting.
const ACTION_CLASSES: Record<PermissionAction, string> = {
  create: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  read: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-300",
  update: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  delete: "bg-red-500/10 text-red-700 dark:text-red-300",
};

/**
 * One permission of the catalogue: what it lets you do, and which roles hand it
 * out. `grantedBy` counts the roles, not the accounts — a permission nobody
 * grants is the one worth noticing.
 */
export function PermissionCard({
  permission,
  grantedBy,
}: Readonly<{ permission: Permission; grantedBy: string[] }>) {
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{permission.label}</span>
          <code className="text-xs text-zinc-400">{permission.key}</code>
        </div>

        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_CLASSES[permission.action]}`}
        >
          {ACTION_LABELS[permission.action]}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {permission.billable ? (
          <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">
            💰 Administrateurs uniquement
          </span>
        ) : null}

        {grantedBy.length === 0 ? (
          <span className="text-xs text-zinc-400">Aucun rôle ne l&apos;a</span>
        ) : (
          grantedBy.map(label => (
            <span
              key={label}
              className="rounded-full border border-black/10 px-2 py-0.5 text-xs dark:border-white/15"
            >
              {label}
            </span>
          ))
        )}
      </div>
    </li>
  );
}
