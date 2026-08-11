"use client";

import { useState } from "react";

import { Modal } from "@/components/Modal";
import { ModalHeader } from "@/components/ModalHeader";
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
  initial,
  onSubmit,
  onCancel,
  disabled,
}: Readonly<{
  players: { id: PlayerId; name: string }[];
  sheet: ScoreSheetItem[];
  /**
   * Cells the game already knows the answer to (the milestones taken during
   * play). They open filled in and stay editable like any other — what was
   * tracked is a head start, not a verdict.
   */
  initial?: CategoryRaw;
  onSubmit: (values: Record<string, Record<string, number>>) => void;
  onCancel: () => void;
  disabled: boolean;
}>) {
  const [raw, setRaw] = useState<CategoryRaw>(() => initial ?? {});

  const remaining = gridRemaining(players, sheet, raw);
  const complete = remaining === 0;

  function setCell(playerId: PlayerId, key: string, text: string) {
    setRaw(r => ({
      ...r,
      [playerId]: { ...r[playerId], [key]: text },
    }));
  }

  return (
    <Modal
      onClose={onCancel}
      dismissable={false}
      label="Comptage des points"
      className={`${modalCardClass} max-w-md`}
    >
      <ModalHeader title="Comptage des points" onClose={onCancel} />

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
