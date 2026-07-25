import { type CatanTerrain, TERRAIN_RESOURCE } from "@/lib/catan/board";
import { RESOURCE_LABEL } from "@/lib/catan/warnings";
import { SEA_STYLE, TERRAIN_STYLE } from "./CatanBoardSvg";

const TERRAIN_NAME: Record<CatanTerrain, string> = {
  forest: "Forêt",
  pasture: "Prairie",
  fields: "Champs",
  hills: "Collines",
  mountains: "Montagnes",
  desert: "Désert",
};

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
  const items = terrains.map(terrain => {
    const resource = TERRAIN_RESOURCE[terrain];

    return {
      key: terrain as string,
      label: TERRAIN_NAME[terrain],
      hint: resource === null ? "voleur" : RESOURCE_LABEL[resource],
      color: TERRAIN_STYLE[terrain].fill,
    };
  });

  if (sea) {
    items.push({
      key: "sea",
      label: "Mer",
      hint: "navigation",
      color: SEA_STYLE.fill,
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
              style={{ backgroundColor: item.color }}
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
