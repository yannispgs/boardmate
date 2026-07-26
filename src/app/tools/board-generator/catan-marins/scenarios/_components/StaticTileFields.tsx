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
 * The two go together — every land but the desert is rolled for, so the field
 * offers the ten tokens of a board and nothing else, and it disappears on the
 * sea and on a desert, which are never rolled for at all.
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
    <div className="flex items-center gap-2">
      <select
        value={terrain}
        onChange={e => onTerrain(e.target.value as SpecTerrain)}
        className={`${fieldClass} flex-1`}
      >
        {SPEC_TERRAIN_ORDER.map(value => (
          <option key={value} value={value}>
            {SPEC_TERRAIN_NAME[value]}
          </option>
        ))}
      </select>
      {bearsToken(terrain) ? (
        <select
          value={token}
          onChange={e => onToken(Number(e.target.value))}
          className={`${fieldClass} w-32`}
        >
          {TOKEN_VALUES.map(value => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}
