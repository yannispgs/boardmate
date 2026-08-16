"use client";

import { useState } from "react";

import { CloseIcon } from "@/components/icons";
import { fieldClass } from "@/components/ui";
import type { Account, Role, RoleId } from "@/lib/domain";
import {
  accountRoles,
  assignableRoles,
  roleRemovalBlocker,
} from "@/lib/domain";

/**
 * When the account last opened a session, in the reader's own time zone. An
 * account that never has says so: it is the sign that an invitation went out
 * and nothing came of it.
 */
function seen(lastSignInAt: string | null): string {
  if (lastSignInAt === null) {
    return "Jamais connecté";
  }

  return `Dernière connexion le ${new Date(lastSignInAt).toLocaleDateString("fr-FR")}`;
}

/**
 * One account and the roles it wears, with the means to hand it another or take
 * one back — the only screen where the two halves of the access model meet.
 *
 * An administrator badge is shown like any other, but carries no ✕ and never
 * appears in the picker: that role is given and taken in the database, and the
 * policies on `user_roles` say so in both directions.
 */
export function AccountCard({
  account,
  roles,
  onAssign,
  onUnassign,
}: Readonly<{
  account: Account;
  roles: Role[];
  /** Both omitted when the reader lacks `roles.assign`: the card is read-only. */
  onAssign?: (account: Account, roleId: RoleId) => void;
  onUnassign?: (account: Account, role: Role) => void;
}>) {
  const [picked, setPicked] = useState("");
  const worn = accountRoles(account, roles);
  const offerable = assignableRoles(account, roles);
  const blockers = [
    ...new Set(
      worn
        .map(roleRemovalBlocker)
        .filter((reason): reason is string => reason !== null),
    ),
  ];

  function hand() {
    if (picked === "") {
      return;
    }

    setPicked("");
    onAssign?.(account, picked as RoleId);
  }

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-900">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate font-medium">{account.email}</span>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {seen(account.lastSignInAt)}
        </span>
      </div>

      {worn.length === 0 ? (
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          Aucun rôle attribué.
        </span>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {worn.map(role => (
            <RoleBadge
              key={role.id}
              role={role}
              onRemove={
                onUnassign ? () => onUnassign(account, role) : undefined
              }
            />
          ))}
        </ul>
      )}

      {/* Written out, not hidden in a tooltip: on a phone there is no hover,
          and a badge with no ✕ would otherwise just look broken. */}
      {onUnassign
        ? blockers.map(reason => (
            <span
              key={reason}
              className="text-xs text-zinc-500 dark:text-zinc-400"
            >
              {reason}
            </span>
          ))
        : null}

      {onAssign ? (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={picked}
            onChange={event => setPicked(event.target.value)}
            aria-label={`Rôle à attribuer à ${account.email}`}
            disabled={offerable.length === 0}
            className={`${fieldClass} min-w-0 flex-1 disabled:opacity-40`}
          >
            <option value="">
              {offerable.length === 0
                ? "Aucun rôle à attribuer"
                : "Choisir un rôle…"}
            </option>

            {offerable.map(role => (
              <option key={role.id} value={role.id}>
                {role.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={hand}
            disabled={picked === ""}
            className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-40"
          >
            Attribuer
          </button>
        </div>
      ) : null}
    </li>
  );
}

/** A role worn, with its ✕ when it can come back off. */
function RoleBadge({
  role,
  onRemove,
}: Readonly<{ role: Role; onRemove?: () => void }>) {
  const blocker = roleRemovalBlocker(role);

  return (
    <li
      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        role.isAdmin
          ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
          : "border border-black/10 text-zinc-600 dark:border-white/15 dark:text-zinc-300"
      }`}
    >
      {role.label}

      {onRemove && blocker === null ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Retirer ${role.label}`}
          className="rounded-full p-0.5 text-zinc-400 transition hover:bg-black/5 hover:text-red-600 dark:hover:bg-white/10 dark:hover:text-red-400"
        >
          <CloseIcon className="h-3 w-3" />
        </button>
      ) : null}
    </li>
  );
}
