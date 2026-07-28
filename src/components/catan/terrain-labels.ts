// What each terrain is called on screen, shared by the legend and the scenario
// editor so a tile is named the same wherever it is shown.

import type { CatanTerrain } from "@/lib/catan/board";
import type { SpecTerrain } from "@/lib/catan/scenario-spec";

export const TERRAIN_NAME: Record<CatanTerrain, string> = {
  forest: "Forêt",
  pasture: "Pré",
  fields: "Champs",
  hills: "Collines",
  mountains: "Montagnes",
  gold: "Rivière d'or",
  desert: "Désert",
};

/** The same, plus the sea a Marins map is built around. */
export const SPEC_TERRAIN_NAME: Record<SpecTerrain, string> = {
  ...TERRAIN_NAME,
  sea: "Mer",
};

/**
 * The order tiles are listed in, top to bottom, in the scenario booklets. Every
 * list in the app follows it — legends, bags, tile pickers — so counting the
 * tiles of a printed scenario into the editor is a matter of reading down both
 * columns at once.
 */
export const TERRAIN_ORDER: CatanTerrain[] = [
  "desert",
  "gold",
  "fields",
  "hills",
  "mountains",
  "pasture",
  "forest",
];

/**
 * The same, sea first — a Marins map is mostly water, whether it is being
 * poured into a bag or fixed one tile at a time.
 */
export const SPEC_TERRAIN_ORDER: SpecTerrain[] = ["sea", ...TERRAIN_ORDER];
