"use client";

import type { ScenarioSpec } from "@/lib/catan/scenario-spec";
import { ZonePanel } from "./ZonePanel";
import { ZonePicker } from "./ZonePicker";

/**
 * Everything that belongs to one zone, inside a frame of its own: which zone the
 * brush paints into, and the bag of the one being edited. Framed because what
 * sits above and below — the tool, the harbours of the board itself — is about
 * the whole map, and one column of panels running on end read as if it were all
 * the selected zone's.
 */
export function ZoneSection({
  spec,
  board,
  zone,
  onChange,
  onPick,
}: Readonly<{
  spec: ScenarioSpec;
  board: number;
  /** The zone being edited, or -1 on a map that has none. */
  zone: number;
  onChange: (spec: ScenarioSpec) => void;
  onPick: (zone: number) => void;
}>) {
  return (
    <div className="flex flex-col gap-5 rounded-xl border border-indigo-500/25 bg-indigo-500/[0.03] p-3 dark:border-indigo-400/25 dark:bg-indigo-400/[0.04]">
      <ZonePicker
        spec={spec}
        board={board}
        zone={zone}
        onChange={onChange}
        onPick={onPick}
      />

      {/* A map may hold nothing but fixed tiles, so there is not always a zone
          to show the bag of. */}
      {spec.boards[board].zones[zone] === undefined ? null : (
        <ZonePanel
          spec={spec}
          board={board}
          zone={zone}
          onChange={onChange}
          onRemoved={() => onPick(0)}
        />
      )}
    </div>
  );
}
