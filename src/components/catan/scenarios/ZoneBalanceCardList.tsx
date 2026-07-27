"use client";

import type { ScenarioSpec } from "@/lib/catan/scenario-spec";
import { ZoneBalanceCard } from "./ZoneBalanceCard";

/**
 * The zones of the board being edited, each free to ask for a margin of its
 * own. A continent players start on and islands they only reach later are
 * balanced on average by the board's margin alone: a zone that must stand on
 * its own — no resource nearly missing from it — says so here.
 */
export function ZoneBalanceCardList({
  spec,
  board,
  onChange,
}: Readonly<{
  spec: ScenarioSpec;
  board: number;
  onChange: (zone: number, tolerance: number | null) => void;
}>) {
  const zones = (spec.boards[board] ?? spec.boards[0]).zones;

  if (zones.length === 0) {
    return (
      <p className="text-[11px] text-zinc-400">
        Ce plateau n'a pas encore de zone.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-black/10 p-3 dark:border-white/10">
      {zones.map((zone, index) => (
        <ZoneBalanceCard
          // biome-ignore lint/suspicious/noArrayIndexKey: a zone is identified by its index, which is how every draft operation names it
          key={index} // NOSONAR: same reason
          zone={zone}
          onChange={tolerance => onChange(index, tolerance)}
        />
      ))}
    </div>
  );
}
