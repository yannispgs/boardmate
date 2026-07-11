"use client";

import type { Config } from "@/lib/domain";
import { ConfigCard } from "./ConfigCard";

/** The list of existing configurations (or an empty-state message). */
export function ConfigCardList({
  configs,
  onDuplicate,
  onEdit,
  onDelete,
}: {
  configs: Config[];
  onDuplicate: (config: Config) => void;
  onEdit: (config: Config) => void;
  onDelete: (config: Config) => void;
}) {
  if (configs.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Aucune configuration pour l&apos;instant.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {configs.map(config => (
        <ConfigCard
          key={config.id}
          config={config}
          onDuplicate={onDuplicate}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
