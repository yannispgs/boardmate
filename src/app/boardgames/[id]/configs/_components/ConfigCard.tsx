"use client";

import { CopyIcon, PencilIcon, TrashIcon } from "@/components/icons";
import { dangerIconButtonClass, iconButtonClass } from "@/components/ui";
import type { Config } from "@/lib/domain";

/** One configuration row: its name and the duplicate / edit / delete actions. */
export function ConfigCard({
  config,
  onDuplicate,
  onEdit,
  onDelete,
}: {
  config: Config;
  onDuplicate: (config: Config) => void;
  onEdit: (config: Config) => void;
  onDelete: (config: Config) => void;
}) {
  return (
    <li className="flex items-center justify-between gap-2 rounded-xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-zinc-900">
      <span className="min-w-0 flex-1 truncate font-medium">{config.name}</span>
      <button
        type="button"
        onClick={() => onDuplicate(config)}
        aria-label={`Dupliquer ${config.name}`}
        title="Dupliquer"
        className={iconButtonClass}
      >
        <CopyIcon />
      </button>
      <button
        type="button"
        onClick={() => onEdit(config)}
        aria-label={`Modifier ${config.name}`}
        title="Modifier"
        className={iconButtonClass}
      >
        <PencilIcon />
      </button>
      <button
        type="button"
        onClick={() => onDelete(config)}
        aria-label={`Supprimer ${config.name}`}
        title="Supprimer"
        className={dangerIconButtonClass}
      >
        <TrashIcon />
      </button>
    </li>
  );
}
