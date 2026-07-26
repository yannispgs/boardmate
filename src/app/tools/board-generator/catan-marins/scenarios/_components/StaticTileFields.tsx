"use client";

import {
  SPEC_TERRAIN_NAME,
  SPEC_TERRAIN_ORDER,
} from "@/components/catan/terrain-labels";
import { fieldClass } from "@/components/ui";
import { bearsToken, type SpecTerrain } from "@/lib/catan/scenario-spec";

/**
 * What the next fixed tile is made of: its terrain, and the token printed on it.
 * Nothing is ever rolled for the sea or for a desert, so on those two the token
 * field is not offered at all — it used to be, and only said so afterwards, in
 * the checks.
 */
export function StaticTileFields({
  terrain,
  token,
  onTerrain,
  onToken,
}: Readonly<{
  terrain: SpecTerrain;
  /** Empty when the tile is fixed without a token, which is allowed. */
  token: number | "";
  onTerrain: (terrain: SpecTerrain) => void;
  onToken: (token: number | "") => void;
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
        <input
          type="number"
          min={2}
          max={12}
          value={token}
          placeholder="jeton"
          onChange={e =>
            onToken(e.target.value === "" ? "" : Number(e.target.value))
          }
          className={`${fieldClass} w-24`}
        />
      ) : null}
    </div>
  );
}
