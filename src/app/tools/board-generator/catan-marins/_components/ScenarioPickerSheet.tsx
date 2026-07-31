"use client";

import { Modal } from "@/components/Modal";
import { ModalHeader } from "@/components/ModalHeader";
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
      <ModalHeader
        title="Scénarios"
        hint={`${drawable.length} à tirer${seats === null ? "" : ` · ${seats} joueurs`}`}
        onClose={onClose}
      />

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
