// The colour chip a terrain is listed with, shared by every list that names one
// — the legend, the fog material, the scenario editor's bags.

import type { SpecTerrain } from "@/lib/catan/scenario-spec";
import { GOLD_RIVER, SEA_STYLE, TERRAIN_STYLE } from "./CatanBoardSvg";

/**
 * What a chip of that terrain is filled with, as a CSS `background`. Every
 * terrain is one flat colour, bar the gold river: a chip is far too small to
 * draw its band on, so it fades from the tile's rock to its gold instead —
 * enough to tell it apart from the flat yellow of the fields.
 */
export function terrainSwatch(terrain: SpecTerrain): string {
  if (terrain === "gold") {
    return `linear-gradient(135deg, ${TERRAIN_STYLE.gold.fill} 0%, ${GOLD_RIVER} 100%)`;
  }

  return terrain === "sea" ? SEA_STYLE.fill : TERRAIN_STYLE[terrain].fill;
}
