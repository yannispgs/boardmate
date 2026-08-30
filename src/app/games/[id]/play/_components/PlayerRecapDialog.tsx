"use client";

import { Modal } from "@/components/Modal";
import { ModalHeader } from "@/components/ModalHeader";
import { DotPlotChart } from "@/components/stats/DotPlotChart";
import type { PlayerRecap, RecapMeasure } from "@/lib/game/player-recap";
import { dotPlot } from "@/lib/game/score-distribution";

import {
  measureHint,
  measureLabel,
  measureStanding,
  measureValue,
} from "./recap-measure";

/**
 * One measure's spread: a dot per evening, tonight among the ones before it and
 * picked out from them. The cloud behind it is dimmed rather than coloured —
 * the reader is looking for a single dot, not reading the shape.
 */
function MeasureSpread({ measure }: Readonly<{ measure: RecapMeasure }>) {
  const plot = dotPlot([...measure.past, measure.value]);

  if (plot === null) {
    return null;
  }

  return (
    <DotPlotChart
      plot={plot}
      label={`Répartition — ${measureValue(measure.key, measure.value)}`}
      format={v => measureValue(measure.key, v)}
      highlight={measure.value}
    />
  );
}

/** One measure in full: tonight's figure, where it stands, and the spread. */
function MeasureBlock({ measure }: Readonly<{ measure: RecapMeasure }>) {
  const standing = measureStanding(measure);
  const hint = measureHint(measure.key);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          {measureLabel(measure.key)}
        </h3>
        <span className="text-lg font-semibold tabular-nums">
          {measureValue(measure.key, measure.value)}
        </span>
      </div>

      {standing === null ? null : (
        <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
          {standing}
        </span>
      )}

      {measure.past.length === 0 ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Rien à comparer encore — c&apos;est la première.
        </p>
      ) : (
        <MeasureSpread measure={measure} />
      )}

      {hint === null ? null : (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
      )}
    </div>
  );
}

/**
 * The spread behind one player's card: each of tonight's figures dropped into
 * the cloud of the same figure on his own past evenings, tonight picked out.
 *
 * The cloud is his and his alone — nobody else's dot is in it. The table is
 * already ranked by the score sheet a tab away; what this answers is the other
 * question, « est-ce que j'ai bien joué, pour moi ? ».
 */
export function PlayerRecapDialog({
  recap,
  scopeLabel,
  onClose,
}: Readonly<{
  recap: PlayerRecap;
  /** Which evenings the cloud holds — the section's own switch, echoed here. */
  scopeLabel: string;
  onClose: () => void;
}>) {
  return (
    <Modal
      onClose={onClose}
      label={recap.name}
      className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-zinc-900"
    >
      <ModalHeader title={recap.name} hint={scopeLabel} onClose={onClose} />

      <div className="flex flex-col gap-5 overflow-y-auto p-4">
        {recap.measures.map(measure => (
          <MeasureBlock key={measure.key} measure={measure} />
        ))}
      </div>
    </Modal>
  );
}
