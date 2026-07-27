/**
 * Turns the generator's {@link BoardWarning}s into player-facing French — the
 * rules it aimed for but couldn't fully satisfy on a given board. Shared by
 * every Catan generator (base and Marins).
 */

import type { BoardWarning, CatanResource } from "./board";

/** The French name of the resource a terrain produces. */
export const RESOURCE_LABEL: Record<CatanResource, string> = {
  wood: "bois",
  brick: "argile",
  wool: "laine",
  grain: "blé",
  ore: "minerai",
};

/**
 * A resource sitting outside its band, phrased from "production" on so the
 * caller can head the sentence. The band is the same measure whether it is read
 * over the whole board or over one zone, so it gets the same sentence.
 */
function bandText(w: {
  resource: CatanResource;
  combos: number;
  low: number;
  high: number;
}): string {
  // The band is fractional; show the exact integer limit that was broken so
  // the message can never contradict the check (e.g. 17 combos is out when
  // the real cap is 16.6, whose whole-number limit is 16, not a rounded 17).
  const tooHigh = w.combos > w.high;
  const limit = tooHigh ? Math.floor(w.high) : Math.ceil(w.low);

  return `production de ${RESOURCE_LABEL[w.resource]} est ${
    tooHigh ? "trop forte" : "trop faible"
  } (${w.combos} combinaisons, ${tooHigh ? "maximum" : "minimum"} ${limit}).`;
}

/** A single unmet placement rule, phrased for the player. */
export function warningText(w: BoardWarning): string {
  switch (w.kind) {
    case "intersectionTooStrong": {
      const plural = w.count > 1;

      return `${w.count} intersection${plural ? "s" : ""} dépasse${
        plural ? "nt" : ""
      } le plafond de ${w.max} pastilles (jusqu'à ${w.worst}).`;
    }
    case "resourceBalance": {
      return `La ${bandText(w)}`;
    }
    case "zoneBalance": {
      return `Zone « ${w.zone} » : la ${bandText(w)}`;
    }
    default: {
      return `Un port 2:1 est adjacent à une tuile de sa ressource (${w.resources
        .map(r => RESOURCE_LABEL[r])
        .join(", ")}).`;
    }
  }
}
