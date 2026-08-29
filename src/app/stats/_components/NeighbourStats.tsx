"use client";

import { useState } from "react";

import { InfoTip } from "@/components/InfoTip";
import type { NeighbourBoard, NeighbourStat } from "@/lib/game/neighbour-stats";
import { MIN_PARTIES, MIN_SEATS } from "@/lib/game/neighbour-stats";

import { NeighbourCardList } from "./NeighbourCardList";
import { NeighbourDetailDialog } from "./NeighbourDetailDialog";

/**
 * « On perd quand il est à côté de nous » — the one game where that is a rule
 * rather than a superstition. On a pair-scored game every pile is shared by two
 * neighbours and a total is the product of the two flanking a seat, so half of
 * your score is built with the player on your left and half with the one on
 * your right.
 *
 * Renders nothing until somebody clears {@link MIN_PARTIES}: an empty section
 * says « not yet », a section holding one player's single evening says
 * something false.
 */
export function NeighbourStats({ board }: Readonly<{ board: NeighbourBoard }>) {
  const [open, setOpen] = useState<NeighbourStat | null>(null);

  if (board.stats.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="flex items-center gap-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">
        Ce que valent vos voisins
        <InfoTip label="Détails sur le voisinage">
          <p>
            Sur un jeu où les points sont <strong>partagés en piles</strong>,
            votre score est le produit des deux piles qui bordent votre place
            &mdash; celle que vous montez avec votre voisin de gauche et celle
            que vous montez avec votre voisin de droite. Vos voisins fabriquent
            donc la moitié de votre score chacun.
          </p>
          <p>
            <strong>L&apos;indice de 0 à 100</strong> dit où finissent les
            voisins d&apos;un joueur&nbsp;: <strong>0</strong> = ils gagnent
            toujours, <strong>100</strong> = ils finissent toujours derniers.
            C&apos;est la même échelle que la position moyenne ailleurs sur la
            page&nbsp;: le petit chiffre est le bon.
          </p>
          <p>
            <strong>La pile partagée</strong> est la mesure la plus honnête des
            deux&nbsp;: un classement se fabrique avec les <em>deux</em> piles
            d&apos;un joueur, donc il porte aussi son autre voisin, alors
            qu&apos;une pile ne porte que ces deux-là.
          </p>
          <p>
            Ne comptent que les parties à {MIN_SEATS} joueurs ou plus (à trois,
            tout le monde est voisin de tout le monde) et les joueurs ayant au
            moins {MIN_PARTIES} parties enregistrées.
          </p>
        </InfoTip>
      </h2>

      <NeighbourCardList
        stats={board.stats}
        pileAverage={board.pileAverage}
        onOpen={setOpen}
      />

      {open === null ? null : (
        <NeighbourDetailDialog
          stat={open}
          pileAverage={board.pileAverage}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}
