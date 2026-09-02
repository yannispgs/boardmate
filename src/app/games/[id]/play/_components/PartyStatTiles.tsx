"use client";

import type { ReactNode } from "react";

import { InfoTip } from "@/components/InfoTip";
import { StatTile } from "@/components/StatTile";
import type { PopulatedGame } from "@/lib/domain";
import type { PartyFigureKey } from "@/lib/game/party-figures";
import { usePartyMeasures } from "@/lib/hooks/use-party-measures";

import { partyLabel, partyValue } from "./party-measure";

/**
 * A word on the figures a reader can mix up. Two of them are durations whose
 * names differ by one word, and a third is a count of the thing they measure —
 * so each tip says what it is *and* what it is not.
 */
const HINTS: Partial<Record<PartyFigureKey, ReactNode>> = {
  rounds: (
    <>
      <p>
        Nombre de <strong>tours de table</strong> joués (un tour = chaque joueur
        a joué une fois).
      </p>
      <p>C&apos;est un compte, pas une durée.</p>
    </>
  ),
  avgRound: (
    <>
      <p>
        <strong>Durée moyenne d&apos;un tour de table</strong>, tous les joueurs
        réunis.
      </p>
      <p>« Tour moyen », juste à côté, est celui d&apos;un seul joueur.</p>
    </>
  ),
  avgTurn: (
    <>
      <p>
        <strong>Durée moyenne du tour d&apos;un joueur</strong> — le temps de
        table divisé par le nombre de tours joués.
      </p>
      <p>
        C&apos;est la mesure que chaque joueur retrouve dans l&apos;onglet « Les
        joueurs ».
      </p>
    </>
  ),
  overtime: (
    <>
      Temps total joué <strong>au-delà du chrono du tour</strong> (le minuteur
      compte à rebours, puis compte le dépassement une fois à zéro).
    </>
  ),
};

/** A figure this panel shows that no history can place — no bar, just a tile. */
export interface PlainTile {
  label: string;
  value: string;
}

/**
 * The party's figures as a grid of tiles, each carrying the bar that places it
 * among the comparable parties before it.
 *
 * Shared by the two panels that read a party in laps — the sequential one and
 * the simultaneous one — which used to build the same grid twice with the same
 * three tiles in it. It loads the history itself rather than take it as a prop,
 * the way {@link ./SessionFactsPanel.SessionFactsPanel} does: its parent runs
 * before the game's shape is known and returns early on three of the four
 * kinds, so a hook up there would fetch for panels that never render.
 */
export function PartyStatTiles({
  game,
  simultaneous,
  pauseCount = 0,
  extra = [],
}: Readonly<{
  game: PopulatedGame;
  /** Whether the table plays each lap at once — drops the mean player turn. */
  simultaneous: boolean;
  /**
   * How many times the table stopped. It gets a tile but never a bar: the
   * recorded history keeps the paused seconds and not how many pauses made them
   * up, so no past party could answer. Zero hides the tile.
   */
  pauseCount?: number;
  /** Figures particular to one panel, appended after the shared ones. */
  extra?: readonly PlainTile[];
}>) {
  const measures = usePartyMeasures(game, simultaneous);

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {measures.flatMap(m => {
        const label = partyLabel(m.key);
        const hint = HINTS[m.key];
        const tile = (
          <StatTile
            key={label}
            label={label}
            value={partyValue(m.key, m.value)}
            // The headline figure of the panel, and the only tinted one.
            accent={m.key === "playTime"}
            gauge={m.gauge}
            info={hint ? <InfoTip label={label}>{hint}</InfoTip> : undefined}
          />
        );

        // The count belongs beside the seconds it made up, not at the end of
        // the grid behind figures that have nothing to do with pausing.
        return m.key === "pauseTime" && pauseCount > 0
          ? [
              <StatTile
                key="Pauses"
                label="Pauses"
                value={String(pauseCount)}
              />,
              tile,
            ]
          : [tile];
      })}

      {extra.map(t => (
        <StatTile key={t.label} label={t.label} value={t.value} />
      ))}
    </div>
  );
}
