// What each terrain is called on screen, shared by the legend and the scenario
// editor so a tile is named the same wherever it is shown.

import type { CatanTerrain } from "@/lib/catan/board";
import type { SpecTerrain } from "@/lib/catan/scenario-spec";

export const TERRAIN_NAME: Record<CatanTerrain, string> = {
  forest: "Forêt",
  pasture: "Prairie",
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
