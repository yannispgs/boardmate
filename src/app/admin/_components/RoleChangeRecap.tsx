"use client";

import type { Permission, PermissionDiff } from "@/lib/domain";

/**
 * What is about to be written, read back in words. A grid of ticked boxes says
 * what a role *holds*; before saving, the question is what it is about to
 * *gain* and *lose* — and the second one is the one nobody can answer by
 * looking at the grid he just spent a minute in.
 *
 * Each line carries the key and the sentence behind it: the key is what a policy
 * names, the sentence is what the person will be able to do tonight.
 */
export function RoleChangeRecap({
  previousLabel,
  label,
  descriptionChanged,
  description,
  diff,
  permissions,
}: Readonly<{
  /** The name it goes by today, or `null` when the role is being created. */
  previousLabel: string | null;
  label: string;
  /** Whether the sentence under the name is being rewritten (edits only). */
  descriptionChanged: boolean;
  /** What it will say, `null` when it is being cleared or was never written. */
  description: string | null;
  diff: PermissionDiff;
  permissions: Permission[];
}>) {
  const byKey = new Map(
    permissions.map(permission => [permission.key, permission]),
  );
  const renamed = previousLabel !== null && previousLabel !== label;

  function lines(keys: string[]) {
    return keys.map(key => (
      <li key={key} className="flex flex-col">
        <code className="text-[13px]">{key}</code>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {byKey.get(key)?.label}
        </span>
      </li>
    ));
  }

  return (
    <div className="flex flex-col gap-3 text-sm">
      {renamed ? (
        <p className="text-zinc-600 dark:text-zinc-300">
          Nom : « {previousLabel} » → « {label} »
        </p>
      ) : null}

      {descriptionChanged ? (
        <p className="text-zinc-600 dark:text-zinc-300">
          Description :{" "}
          {description === null ? "retirée." : `« ${description} »`}
        </p>
      ) : null}

      {diff.added.length > 0 ? (
        <div className="flex flex-col gap-1">
          <span className="font-medium text-emerald-700 dark:text-emerald-300">
            + {diff.added.length} permission
            {diff.added.length > 1 ? "s" : ""} ajoutée
            {diff.added.length > 1 ? "s" : ""}
          </span>

          <ul className="flex flex-col gap-1">{lines(diff.added)}</ul>
        </div>
      ) : null}

      {diff.removed.length > 0 ? (
        <div className="flex flex-col gap-1">
          <span className="font-medium text-red-700 dark:text-red-300">
            − {diff.removed.length} permission
            {diff.removed.length > 1 ? "s" : ""} retirée
            {diff.removed.length > 1 ? "s" : ""}
          </span>

          <ul className="flex flex-col gap-1">{lines(diff.removed)}</ul>
        </div>
      ) : null}

      {diff.added.length === 0 && diff.removed.length === 0 ? (
        <p className="text-zinc-500 dark:text-zinc-400">
          Aucune permission ajoutée ni retirée.
        </p>
      ) : null}
    </div>
  );
}
