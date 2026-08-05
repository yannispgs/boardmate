"use client";

import { useState } from "react";

import { Modal } from "@/components/Modal";
import { ModalHeader } from "@/components/ModalHeader";
import { modalCardClass } from "@/components/ui";
import { pilesRemaining } from "@/lib/game/pair-scoring";
import { PairScoreCircle, type Seat } from "./PairScoreCircle";

/**
 * End-of-game pair scoresheet in a modal: the table drawn as a circle
 * ({@link PairScoreCircle}) plus the "Total final" gate. Every pile has to be
 * counted before the totals are worth anything — one missing pile zeroes two
 * players — so the gate waits for the whole ring.
 */
export function PairScoreEntry({
  seats,
  onSubmit,
  onCancel,
  disabled,
}: {
  seats: Seat[];
  onSubmit: (piles: Record<string, number>) => void;
  onCancel: () => void;
  disabled: boolean;
}) {
  const [piles, setPiles] = useState<Record<string, number>>({});

  const remaining = pilesRemaining(
    seats.map(s => s.id),
    piles,
  );

  return (
    <Modal
      onClose={onCancel}
      dismissable={false}
      label="Comptage des points"
      className={`${modalCardClass} max-w-md`}
    >
      <ModalHeader
        title="Comptage des points"
        hint="Chaque tas est partagé par deux voisins ; le score d'un joueur est le produit de ses deux tas."
        onClose={onCancel}
      />

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <PairScoreCircle
          seats={seats}
          piles={piles}
          onPile={(key, value) => setPiles(p => ({ ...p, [key]: value }))}
          disabled={disabled}
        />
      </div>

      <div className="border-t border-black/10 p-4 dark:border-white/10">
        <button
          type="button"
          disabled={disabled || remaining > 0}
          onClick={() => onSubmit(piles)}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          Total final
        </button>

        {remaining === 0 ? null : (
          <p className="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
            Encore {remaining} tas à compter
          </p>
        )}
      </div>
    </Modal>
  );
}
