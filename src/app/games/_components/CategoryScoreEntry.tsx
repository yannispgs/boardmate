"use client";

import { useState } from "react";

import { Modal } from "@/components/Modal";
import { modalCardClass } from "@/components/ui";
import type { PlayerId, ScoreSheetItem } from "@/lib/domain";
import {
  type CategoryRaw,
  CategoryScoreGrid,
  gridRemaining,
  gridValues,
} from "./CategoryScoreGrid";

/**
 * End-of-game category scoresheet in a modal: the double-entry grid
 * ({@link CategoryScoreGrid}) plus the "Total final" gate. The grand total
 * stays hidden until "Total final" to keep the suspense for the reveal.
 */
export function CategoryScoreEntry({
  players,
  sheet,
  onSubmit,
  onCancel,
  disabled,
}: {
  players: { id: PlayerId; name: string }[];
  sheet: ScoreSheetItem[];
  onSubmit: (values: Record<string, Record<string, number>>) => void;
  onCancel: () => void;
  disabled: boolean;
}) {
  const [raw, setRaw] = useState<CategoryRaw>({});

  const remaining = gridRemaining(players, sheet, raw);
  const complete = remaining === 0;

  function setCell(playerId: PlayerId, key: string, text: string) {
    setRaw(r => ({
      ...r,
      [playerId]: { ...(r[playerId] ?? {}), [key]: text },
    }));
  }

  return (
    <Modal
      onClose={onCancel}
      dismissable={false}
      label="Comptage des points"
      className={`${modalCardClass} max-w-md`}
    >
      <div className="flex items-center justify-between border-b border-black/10 p-4 dark:border-white/10">
        <h2 className="text-base font-semibold">Comptage des points</h2>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-black/10 px-3 py-1 text-sm transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
        >
          Fermer
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        <CategoryScoreGrid
          players={players}
          sheet={sheet}
          raw={raw}
          onCell={setCell}
          disabled={disabled}
        />
      </div>

      <div className="border-t border-black/10 p-4 dark:border-white/10">
        <button
          type="button"
          disabled={disabled || !complete}
          onClick={() => onSubmit(gridValues(players, sheet, raw))}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          Total final
        </button>
        {complete ? null : (
          <p className="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
            Encore {remaining} case{remaining > 1 ? "s" : ""} à remplir
          </p>
        )}
      </div>
    </Modal>
  );
}
