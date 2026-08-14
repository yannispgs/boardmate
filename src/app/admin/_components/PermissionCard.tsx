"use client";

import { InfoTip } from "@/components/InfoTip";
import type { Permission, PermissionAction } from "@/lib/domain";

// Read is the harmless one and deletion the one you don't undo; the colours say
// so at a glance, which is the whole point of a grid you scan before granting.
// The word itself stays in English — it is the CRUD family, not prose, and
// `update` is half the width of « Modifier » on a phone.
const ACTION_CLASSES: Record<PermissionAction, string> = {
  create: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  read: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-300",
  update: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  delete: "bg-red-500/10 text-red-700 dark:text-red-300",
};

/**
 * One permission, on one line: the key first — it is what the roles refer to and
 * what a policy names — then an info bubble holding the sentence, then its CRUD
 * family on the right. Which roles hand it out is deliberately not here; that
 * question is answered role by role, in the other tab.
 */
export function PermissionCard({
  permission,
}: Readonly<{ permission: Permission }>) {
  return (
    <li className="flex items-center gap-2 px-3 py-2">
      <code className="truncate text-[13px] text-zinc-700 dark:text-zinc-200">
        {permission.key}
      </code>

      <InfoTip label={permission.key}>
        <p>{permission.label}</p>
        {permission.billable ? (
          <p>
            💰 Chaque usage coûte de l&apos;argent : seuls les rôles
            administrateurs peuvent la porter.
          </p>
        ) : null}
      </InfoTip>

      {permission.billable ? <span className="text-xs">💰</span> : null}

      <span
        className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_CLASSES[permission.action]}`}
      >
        {permission.action}
      </span>
    </li>
  );
}
