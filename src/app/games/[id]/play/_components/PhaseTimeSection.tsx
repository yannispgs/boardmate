"use client";

import { PhaseShareBar } from "@/components/phases/PhaseShareBar";
import { PhaseStageChart } from "@/components/phases/PhaseStageChart";
import { PhaseTotalsLegend } from "@/components/phases/PhaseTotalsLegend";
import { StatGroup, StatView } from "@/components/stats/StatGroup";
import type { PopulatedGame } from "@/lib/domain";
import { stageBreakdowns } from "@/lib/game/phase-stats";
import { usePhaseMeasures } from "@/lib/hooks/use-phase-measures";

/**
 * « Temps par phase » in the end-of-game recap: how each generation was spent,
 * then what the party as a whole was made of.
 *
 * The two readings are boxed and named one by one. The section used to carry a
 * single title, « Temps par phase — génération par génération », above both —
 * so the share bar and its legend, which speak of the whole party, were filed
 * under a heading announcing the opposite.
 *
 * Renders nothing for the games that declare no phase — which is every game but
 * two — and nothing either while no phase has been closed yet.
 */
export function PhaseTimeSection({
  game,
  stageLabel,
}: Readonly<{ game: PopulatedGame; stageLabel: string }>) {
  // Before the early return, as any hook must be: a game with no phase renders
  // nothing here, and the hook then measures an empty list into an empty one.
  const totals = usePhaseMeasures(game);
  const phases = game.boardgame.phases;
  const stages = stageBreakdowns(game.phaseTimes, phases);

  if (!phases || stages.length === 0) {
    return null;
  }

  const stageWord = stageLabel.toLowerCase();

  return (
    <StatGroup title="Temps par phase">
      <StatView
        title={`${stageWord} par ${stageWord}`}
        info={
          <>
            <p>
              Une colonne par {stageWord} jouée, dans l&apos;ordre. Sa{" "}
              <strong>hauteur</strong> est le temps qu&apos;elle a pris face à
              la plus longue, ses <strong>segments</strong> sont son propre
              partage entre les phases.
            </p>
            <p>
              La première phase est toujours posée sur l&apos;axe : on suit
              ainsi une même phase d&apos;une {stageWord} à l&apos;autre.
            </p>
          </>
        }
      >
        <PhaseStageChart
          stages={stages}
          phases={phases}
          stageLabel={stageLabel}
        />
      </StatView>

      <StatView
        title="Sur toute la partie"
        info={
          <>
            <p>
              Les mêmes secondes, additionnées sur toutes les {stageWord}s : la
              part que chaque phase a prise de la soirée, et sa durée en clair.
            </p>
            <p>
              Sous chaque phase, une barre la situe parmi les parties
              précédentes&nbsp;: vide, la table n&apos;a jamais fait plus
              court&nbsp;; pleine, jamais plus long. Chaque phase a sa propre
              échelle — elles se comparent à elles-mêmes, pas entre elles.
            </p>
          </>
        }
      >
        <PhaseShareBar totals={totals} phases={phases} />
        <PhaseTotalsLegend totals={totals} phases={phases} />
      </StatView>
    </StatGroup>
  );
}
