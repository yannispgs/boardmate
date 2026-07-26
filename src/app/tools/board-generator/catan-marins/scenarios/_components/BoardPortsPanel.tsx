"use client";

import { setBoardPortTypeCount } from "@/lib/catan/scenario-draft";
import type { ScenarioSpec } from "@/lib/catan/scenario-spec";
import { PanelBlock } from "./PanelBlock";
import { PortTypeFields } from "./PortTypeFields";
import { Tally } from "./Tally";

/**
 * The harbours a printed map sets outside every zone, along a coast the scenario
 * fixes. They belong to the board rather than to a zone, and each one is pinned
 * by hand: there is no bag of spaces here to draw a coastline from.
 */
export function BoardPortsPanel({
  spec,
  board,
  onChange,
}: Readonly<{
  spec: ScenarioSpec;
  board: number;
  onChange: (spec: ScenarioSpec) => void;
}>) {
  const bag = spec.boards[board].ports;

  return (
    <PanelBlock
      title="Ports hors zone"
      hint="Les ports posés sur une tuile fixe de terre : épingle-les un par un sur le plan, en mode « Ports », le long d'une arête qui donne sur la mer ou sur le bord du plateau."
    >
      <PortTypeFields
        bag={bag}
        onCount={(type, count) =>
          onChange(setBoardPortTypeCount(spec, board, type, count))
        }
      />
      <Tally
        label="emplacements"
        have={bag?.slots?.length ?? 0}
        need={bag?.types.length ?? 0}
      />
    </PanelBlock>
  );
}
