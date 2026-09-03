"use client";

import type { ReactNode } from "react";

import { InfoTip } from "@/components/InfoTip";
import { StatTile } from "@/components/StatTile";
import type { PopulatedGame } from "@/lib/domain";
import type { PartyFigureKey } from "@/lib/game/party-figures";
import type { PartyNaming } from "@/lib/game/party-labels";
import { PLAIN_NAMING, partyLabel, partyValue } from "@/lib/game/party-labels";
import { turnPhase } from "@/lib/game/phase-stats";
import { usePartyMeasures } from "@/lib/hooks/use-party-measures";

/**
 * A word on the figures a reader can mix up. The panel is nearly all durations,
 * two pairs of which differ by a single word — the played time against the total
 * one, the table's lap against a player's go — and one of them is a count of
 * what the others measure. So each tip says what it is *and* what it is not.
 */
function hintsFor(
  naming: PartyNaming,
): Partial<Record<PartyFigureKey, ReactNode>> {
  // On a game played in phases, the turn log only covers one of them — so the
  // two averages it feeds price that phase and say which, while the party's own
  // durations say that they cover the lot.
  const phase = naming.turnPhaseLabel;
  const onlyPhase =
    phase === null ? null : (
      <p>
        Ne concerne que la phase <strong>{phase}</strong>&nbsp;: les autres se
        jouent en même temps par toute la table, sans tour de personne.
      </p>
    );
  const everyPhase =
    phase === null ? null : (
      <p>
        <strong>Toutes les phases comprises</strong>, pas seulement «&nbsp;
        {phase}&nbsp;» — c&apos;est la soirée entière.
      </p>
    );

  return {
    playTime: (
      <>
        <p>
          Temps réellement joué, <strong>pauses déduites</strong>.
        </p>
        {everyPhase}
        <p>
          La barre situe ce chiffre parmi les parties précédentes&nbsp;: vide,
          la table n&apos;a jamais fait plus bas&nbsp;; pleine, jamais plus
          haut. Les petits traits sont ces parties, sur la même échelle.
        </p>
      </>
    ),
    totalTime: (
      <>
        <p>
          Temps passé autour de la table, <strong>pauses comprises</strong> — «
          Temps de jeu » plus « Temps en pause ».
        </p>
        {everyPhase}
        <p>
          Il n&apos;apparaît que si la table s&apos;est arrêtée au moins une
          fois&nbsp;: sans pause, il répéterait le temps de jeu.
        </p>
      </>
    ),
    rounds: (
      <>
        <p>
          Nombre de <strong>{`${naming.roundLabel.toLowerCase()}s`}</strong> que
          la partie a duré
          {naming.roundLabel === PLAIN_NAMING.roundLabel
            ? " (un tour = chaque joueur a joué une fois)"
            : ""}
          .
        </p>
        <p>C&apos;est un compte, pas une durée.</p>
      </>
    ),
    avgRound: (
      <>
        <p>
          <strong>Durée moyenne d&apos;un tour de table</strong>, tous les
          joueurs réunis.
        </p>
        {onlyPhase}
        <p>« Tour moyen », juste à côté, est celui d&apos;un seul joueur.</p>
      </>
    ),
    avgTurn: (
      <>
        <p>
          <strong>Durée moyenne du tour d&apos;un joueur</strong> — le temps de
          table divisé par le nombre de tours joués.
        </p>
        {onlyPhase}
        <p>
          C&apos;est la mesure que chaque joueur retrouve dans l&apos;onglet «
          Les joueurs ».
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
}

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
  // The game lends the panel its own words: a box turning in generations does
  // not count « tours », and one played in phases takes its turns in only one
  // of them — which the two turn averages then have to say.
  const naming: PartyNaming = {
    roundLabel: game.boardgame.stages?.label ?? PLAIN_NAMING.roundLabel,
    turnPhaseLabel: turnPhase(game.boardgame.phases)?.label ?? null,
  };
  const hints = hintsFor(naming);
  // Which parties the bars are counted on changes with the game, and the bars
  // themselves cannot say so — carrying no text is the point of them. The tip
  // on the headline figure is where the reader can go and find out.
  const basket =
    game.boardgame.scoring?.playerCountSensitive === true
      ? "Sont comparées les parties de ce jeu au même nombre de joueurs : sur ce jeu-là, la table change les chiffres."
      : "Sont comparées toutes les parties de ce jeu, quel que soit le nombre de joueurs.";

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {measures.flatMap(m => {
        const label = partyLabel(m.key, naming);
        const hint =
          m.key === "playTime" ? (
            <>
              {hints.playTime}
              <p>{basket}</p>
            </>
          ) : (
            hints[m.key]
          );
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
