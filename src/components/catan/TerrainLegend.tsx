import { type CatanTerrain, TERRAIN_RESOURCE } from "@/lib/catan/board";
import { RESOURCE_LABEL } from "@/lib/catan/warnings";
import { TERRAIN_NAME } from "./terrain-labels";
import { terrainSwatch } from "./terrain-swatch";

/** What a tile pays: its resource, or what it does instead of producing one. */
function terrainHint(terrain: CatanTerrain): string {
  const resource = TERRAIN_RESOURCE[terrain];

  if (resource !== null) {
    return RESOURCE_LABEL[resource];
  }

  return terrain === "gold" ? "ressource au choix" : "voleur";
}

/**
 * What each tile colour means, for the terrains a board actually holds, plus
 * the sea on a Marins map. Each entry names the terrain and, in brackets, the
 * resource it produces.
 */
export function TerrainLegend({
  terrains,
  sea = false,
}: {
  terrains: CatanTerrain[];
  sea?: boolean;
}) {
  const items = terrains.map(terrain => ({
    key: terrain as string,
    label: TERRAIN_NAME[terrain],
    hint: terrainHint(terrain),
    swatch: terrainSwatch(terrain),
  }));

  if (sea) {
    items.push({
      key: "sea",
      label: "Mer",
      hint: "navigation",
      swatch: terrainSwatch("sea"),
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
        {items.map(item => (
          <li key={item.key} className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-3.5 w-3.5 shrink-0 rounded-sm border border-black/10"
              style={{ background: item.swatch }}
            />
            <span>
              {item.label}{" "}
              <span className="text-zinc-500 dark:text-zinc-400">
                ({item.hint})
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Les pastilles sous chaque nombre indiquent sa fréquence de sortie.
      </p>
    </div>
  );
}
