"use client";

import type { Permission, PermissionDiff } from "@/lib/domain";

/**
 * One side of the change: what the role gains, or what it loses. Both read the
 * same way — a count, then a line per key — so they are the same component with
 * a colour and a verb, not two blocks kept in step by hand.
 */
function DiffGroup({
  keys,
  byKey,
  sign,
  verb,
  tone,
}: Readonly<{
  keys: string[];
  /** The catalogue, to put the sentence under the key. */
  byKey: Map<string, Permission>;
  /** « + » or « − », read before the count. */
  sign: string;
  /** « ajoutée » or « retirée », in the singular — the s is added here. */
  verb: string;
  tone: string;
}>) {
  if (keys.length === 0) {
    return null;
  }

  const plural = keys.length > 1 ? "s" : "";

  return (
    <div className="flex flex-col gap-1">
      <span className={`font-medium ${tone}`}>
        {sign} {keys.length} permission{plural} {verb}
        {plural}
      </span>

      <ul className="flex flex-col gap-1">
        {keys.map(key => (
          <li key={key} className="flex flex-col">
            <code className="text-[13px]">{key}</code>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {byKey.get(key)?.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

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
  const untouched = diff.added.length === 0 && diff.removed.length === 0;

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

      <DiffGroup
        keys={diff.added}
        byKey={byKey}
        sign="+"
        verb="ajoutée"
        tone="text-emerald-700 dark:text-emerald-300"
      />

      <DiffGroup
        keys={diff.removed}
        byKey={byKey}
        sign="−"
        verb="retirée"
        tone="text-red-700 dark:text-red-300"
      />

      {untouched ? (
        <p className="text-zinc-500 dark:text-zinc-400">
          Aucune permission ajoutée ni retirée.
        </p>
      ) : null}
    </div>
  );
}
