"use client";

import { Checkbox } from "@/components/Checkbox";
import { ToleranceRange } from "@/components/catan/ToleranceRange";
import { DEFAULT_TOLERANCE_PCT } from "@/lib/catan/generator-options";
import type { ScenarioZone } from "@/lib/catan/scenario-spec";

/**
 * One zone's own production margin: held to a margin of its own, or left to
 * serve the board's overall balance alone. Ticking it starts from the same
 * margin the board uses, which is the one an author reaches for anyway.
 */
export function ZoneBalanceCard({
  zone,
  onChange,
}: Readonly<{
  zone: ScenarioZone;
  onChange: (tolerance: number | null) => void;
}>) {
  const tolerance = zone.balanceTolerance;

  return (
    <div className="flex flex-col gap-1.5">
      <Checkbox
        label={zone.name}
        checked={tolerance !== undefined}
        onChange={on => onChange(on ? DEFAULT_TOLERANCE_PCT : null)}
      />
      {tolerance === undefined ? null : (
        <div className="pl-6">
          <ToleranceRange
            label={`Écart toléré dans « ${zone.name} »`}
            value={tolerance}
            onChange={onChange}
          />
        </div>
      )}
    </div>
  );
}
