"use client";

import { Modal } from "@/components/Modal";
import { ModalHeader } from "@/components/ModalHeader";
import { modalCardClass } from "@/components/ui";
import type { NeighbourStat } from "@/lib/game/neighbour-stats";
import { MIN_PARTNER_ENCOUNTERS } from "@/lib/game/neighbour-stats";

import { pileFigure, positionIndex } from "./NeighbourCard";

/**
 * The same question asked of one pairing at a time: what the pile these two
 * build together comes to, and where the partner finished when he sat there.
 *
 * This is where the thin sheet shows. Two players can each have played a great
 * many parties and still have sat side by side three times — so a pairing under
 * {@link MIN_PARTNER_ENCOUNTERS} is **greyed**, never hidden: a reader who came
 * looking for the figure is owed it, and owed the reason it settles nothing.
 */
export function NeighbourDetailDialog({
  stat,
  pileAverage,
  onClose,
}: Readonly<{
  stat: NeighbourStat;
  pileAverage: number | null;
  onClose: () => void;
}>) {
  const hint = [
    `${stat.parties} partie${stat.parties > 1 ? "s" : ""}`,
    pileAverage === null
      ? null
      : `piles adjacentes, moyenne ${pileFigure(pileAverage)}`,
  ]
    .filter(part => part !== null)
    .join(" · ");

  return (
    <Modal onClose={onClose} label="Détail par voisin">
      <div className={`${modalCardClass} max-w-md`}>
        <ModalHeader
          title={`Assis à côté de ${stat.name}`}
          hint={hint}
          onClose={onClose}
        />

        <ul className="flex flex-col divide-y divide-black/5 overflow-y-auto p-2 dark:divide-white/10">
          {stat.partners.map(partner => {
            const thin = partner.encounters < MIN_PARTNER_ENCOUNTERS;

            return (
              <li
                key={partner.playerId}
                className={`flex items-baseline gap-3 px-2 py-2 ${
                  thin ? "text-zinc-400 dark:text-zinc-500" : ""
                }`}
              >
                <span className="min-w-0 flex-1 truncate font-medium">
                  {partner.name}
                </span>
                <span className="shrink-0 text-xs tabular-nums">
                  {thin
                    ? `${partner.encounters} fois — trop peu`
                    : `${partner.encounters} fois`}
                </span>
                <span className="w-14 shrink-0 text-right text-sm tabular-nums">
                  {partner.position === null
                    ? "—"
                    : `${positionIndex(partner.position)}/100`}
                </span>
                <span className="w-12 shrink-0 text-right font-semibold tabular-nums">
                  {partner.sharedPile === null
                    ? "—"
                    : pileFigure(partner.sharedPile)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </Modal>
  );
}
