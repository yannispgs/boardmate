"use client";

import {
  SPEC_TERRAIN_NAME,
  SPEC_TERRAIN_ORDER,
} from "@/components/catan/terrain-labels";
import { fieldClass } from "@/components/ui";
import { TOKEN_VALUES } from "@/lib/catan/scenario-draft";
import { bearsToken, type SpecTerrain } from "@/lib/catan/scenario-spec";

/**
 * What the next fixed tile is made of: its terrain, and the token printed on it.
 * The two go together — every land but the desert is rolled for, so the token is
 * always asked for, and never on the sea or on a desert, which are never rolled
 * for at all.
 */
export function StaticTileFields({
  terrain,
  token,
  onTerrain,
  onToken,
}: Readonly<{
  terrain: SpecTerrain;
  token: number;
  onTerrain: (terrain: SpecTerrain) => void;
  onToken: (token: number) => void;
}>) {
  return (
    <div className="flex flex-col gap-2">
      <select
        value={terrain}
        onChange={e => onTerrain(e.target.value as SpecTerrain)}
        className={fieldClass}
      >
        {SPEC_TERRAIN_ORDER.map(value => (
          <option key={value} value={value}>
            {SPEC_TERRAIN_NAME[value]}
          </option>
        ))}
      </select>
      {/* Laid out, not dropped down: a browser's list is one column tall, where
          the ten tokens of a board read as the two rows they are printed in —
          2 to 6, then 8 to 12 — and are picked in one tap instead of two. */}
      {bearsToken(terrain) ? (
        <div className="grid grid-cols-5 gap-1">
          {TOKEN_VALUES.map(value => (
            <button
              key={value}
              type="button"
              onClick={() => onToken(value)}
              className={`rounded-md py-1.5 text-sm font-medium tabular-nums transition ${
                value === token
                  ? "bg-indigo-600 text-white"
                  : "bg-black/5 text-zinc-600 hover:bg-black/10 dark:bg-white/10 dark:text-zinc-300 dark:hover:bg-white/20"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
