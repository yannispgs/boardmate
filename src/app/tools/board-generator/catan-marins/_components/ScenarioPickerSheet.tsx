"use client";

import { Modal } from "@/components/Modal";
import { modalCardClass } from "@/components/ui";
import type { Drawable } from "@/lib/catan/scenario-listing";
import type { ExtensionScenarioId } from "@/lib/domain";
import { DrawableScenarioCardList } from "./DrawableScenarioCardList";

/**
 * Every scenario on offer at once, opened from the generator's scenario bar.
 * Flipping through the maps is how you compare two of them; this is how you
 * reach the tenth one without going past the nine before it.
 *
 * It lists what the screen behind it lists — the seat filter has already been
 * applied — and says so, rather than looking like the whole collection.
 */
export function ScenarioPickerSheet({
  drawable,
  currentId,
  seats,
  onPick,
  onClose,
}: Readonly<{
  drawable: Drawable[];
  currentId: ExtensionScenarioId;
  /** The seat count the list is narrowed to, or `null` for all of them. */
  seats: number | null;
  onPick: (id: ExtensionScenarioId) => void;
  onClose: () => void;
}>) {
  return (
    <Modal
      onClose={onClose}
      label="Scénarios"
      className={`${modalCardClass} max-w-md`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-black/10 p-4 dark:border-white/10">
        <div className="flex min-w-0 flex-col">
          <h2 className="text-base font-semibold">Scénarios</h2>
          <span className="text-xs text-zinc-500">
            {drawable.length} à tirer
            {seats === null ? "" : ` · ${seats} joueurs`}
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg px-2 py-1 text-sm text-zinc-500 transition hover:bg-black/5 dark:hover:bg-white/10"
        >
          Fermer
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        <DrawableScenarioCardList
          drawable={drawable}
          currentId={currentId}
          onPick={id => {
            onPick(id);
            onClose();
          }}
        />
      </div>
    </Modal>
  );
}
