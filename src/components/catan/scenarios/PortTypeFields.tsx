"use client";

import type { CatanPortType } from "@/lib/catan/board";
import { portTypeCounts } from "@/lib/catan/scenario-draft";
import type { SpecPortBag } from "@/lib/catan/scenario-spec";
import { CountStepper } from "./CountStepper";

const PORT_TYPES: CatanPortType[] = [
  "generic",
  "wood",
  "wool",
  "grain",
  "brick",
  "ore",
];

/** Named by their rate alone: the panel's own title already says "ports". */
const PORT_NAME: Record<CatanPortType, string> = {
  generic: "3:1",
  wood: "bois 2:1",
  wool: "laine 2:1",
  grain: "blé 2:1",
  brick: "argile 2:1",
  ore: "minerai 2:1",
};

/**
 * What a bag of harbours holds, one counter per type. Where they *sit* is pinned
 * on the map, not here — so the same counters serve a zone's bag and the board's.
 */
export function PortTypeFields({
  bag,
  onCount,
}: Readonly<{
  bag: SpecPortBag | undefined;
  onCount: (type: CatanPortType, count: number) => void;
}>) {
  const counts = portTypeCounts(bag?.types ?? []);

  return (
    // All six across one row rather than six labelled lines, twice over: the
    // panel carries this block once for the zone and once for the board.
    <div className="grid grid-cols-6 gap-x-1">
      {PORT_TYPES.map(type => (
        <CountStepper
          key={type}
          label={PORT_NAME[type]}
          layout="stack"
          value={counts.get(type) ?? 0}
          onChange={count => onCount(type, count)}
        />
      ))}
    </div>
  );
}
