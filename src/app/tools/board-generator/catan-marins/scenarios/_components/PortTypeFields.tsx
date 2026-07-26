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

const PORT_NAME: Record<CatanPortType, string> = {
  generic: "Port 3:1",
  wood: "Port bois 2:1",
  wool: "Port laine 2:1",
  grain: "Port blé 2:1",
  brick: "Port argile 2:1",
  ore: "Port minerai 2:1",
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
    <div className="flex flex-col gap-1">
      {PORT_TYPES.map(type => (
        <CountStepper
          key={type}
          label={PORT_NAME[type]}
          value={counts.get(type) ?? 0}
          onChange={count => onCount(type, count)}
        />
      ))}
    </div>
  );
}
