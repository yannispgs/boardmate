"use client";

import { chipClass, sectionHeadingClass } from "@/components/ui";
import { addZone } from "@/lib/catan/scenario-draft";
import type { ScenarioSpec } from "@/lib/catan/scenario-spec";
import { zoneColor } from "./ScenarioCanvas";

/**
 * Which zone the brush paints into, each in the colour it wears on the plan.
 * Only the tools that deal with zones show this — a fixed tile belongs to no
 * zone, so choosing one there would mean nothing.
 */
export function ZonePicker({
  spec,
  board,
  zone,
  onChange,
  onPick,
}: Readonly<{
  spec: ScenarioSpec;
  board: number;
  /** The zone being edited. */
  zone: number;
  onChange: (spec: ScenarioSpec) => void;
  onPick: (zone: number) => void;
}>) {
  const zones = (spec.boards[board] ?? spec.boards[0]).zones;

  return (
    <section className="flex flex-col gap-2">
      <h3 className={sectionHeadingClass}>Zones</h3>
      <div className="flex flex-wrap gap-2">
        {zones.map((z, index) => (
          <button
            // biome-ignore lint/suspicious/noArrayIndexKey: a zone is identified by its index, which is how every draft operation names it
            key={index} // NOSONAR: same reason
            type="button"
            onClick={() => onPick(index)}
            className={`${chipClass(index === zone)} flex items-center gap-2`}
          >
            <span
              aria-hidden
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: zoneColor(index) }}
            />
            {z.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            onChange(addZone(spec, board));
            onPick(zones.length);
          }}
          className={chipClass(false)}
        >
          + Zone
        </button>
      </div>
    </section>
  );
}
