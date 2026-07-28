"use client";

import { IslandRange } from "./IslandRange";

/**
 * One zone's island count, on the screen that draws the board rather than the
 * one that authored it. The zone's bag says how much land it holds; this says
 * how many islands the next draw makes of it.
 */
export function ZoneIslandsCard({
  name,
  islands,
  onChange,
}: Readonly<{
  name: string;
  islands: readonly [number, number];
  onChange: (range: [number, number]) => void;
}>) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm">{name}</span>
      <div className="pl-3">
        <IslandRange value={islands} onChange={onChange} name={name} />
      </div>
    </div>
  );
}
