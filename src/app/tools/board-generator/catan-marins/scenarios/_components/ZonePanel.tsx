"use client";

import { SEA_STYLE, TERRAIN_STYLE } from "@/components/catan/CatanBoardSvg";
import { SPEC_TERRAIN_NAME } from "@/components/catan/terrain-labels";
import { TrashIcon } from "@/components/icons";
import { dangerIconButtonClass } from "@/components/ui";
import {
  removeZone,
  renameZone,
  setPortTypeCount,
  setTerrainCount,
  setTokenCount,
  setZoneHidden,
  setZoneIslands,
  TOKEN_VALUES,
  tokenCounts,
} from "@/lib/catan/scenario-draft";
import {
  bagTileCount,
  type ScenarioSpec,
  type SpecTerrain,
  tokenBearingCount,
} from "@/lib/catan/scenario-spec";
import { CountStepper } from "./CountStepper";
import { PanelBlock } from "./PanelBlock";
import { PortTypeFields } from "./PortTypeFields";
import { Tally } from "./Tally";

/** The bag's terrains, sea first — a Marins map is mostly water. */
const TERRAIN_ORDER: SpecTerrain[] = [
  "sea",
  "forest",
  "pasture",
  "fields",
  "hills",
  "mountains",
  "gold",
  "desert",
];

/** The colour a terrain's counter is chipped with. */
function terrainColor(terrain: SpecTerrain): string {
  return terrain === "sea" ? SEA_STYLE.fill : TERRAIN_STYLE[terrain].fill;
}

/**
 * Everything about the zone being edited: its name, the bag of tiles and tokens
 * dealt into it, whether it is laid face down, how many islands its land should
 * form, and the harbours it carries. The spaces themselves are painted on the
 * canvas, not here.
 */
export function ZonePanel({
  spec,
  board,
  zone,
  onChange,
  onRemoved,
}: Readonly<{
  spec: ScenarioSpec;
  board: number;
  zone: number;
  onChange: (spec: ScenarioSpec) => void;
  /** Called after the zone is dropped, so the editor can select another. */
  onRemoved: () => void;
}>) {
  const current = spec.boards[board].zones[zone];
  const tiles = bagTileCount(current.terrainCounts);
  const tokens = tokenCounts(current.numberTokens);
  const slots = current.ports?.slots?.length ?? 0;
  const portCount = current.ports?.types.length ?? 0;
  const islands = current.islands ?? null;

  function setIslands(min: number, max: number) {
    onChange(setZoneIslands(spec, board, zone, [min, Math.max(min, max)]));
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <input
          value={current.name}
          onChange={e =>
            onChange(renameZone(spec, board, zone, e.target.value))
          }
          placeholder="Nom de la zone"
          className="min-w-0 flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15"
        />
        <button
          type="button"
          onClick={() => {
            onChange(removeZone(spec, board, zone));
            onRemoved();
          }}
          disabled={spec.boards[board].zones.length <= 1}
          aria-label="Supprimer la zone"
          title="Supprimer la zone"
          className={`${dangerIconButtonClass} disabled:opacity-40`}
        >
          <TrashIcon />
        </button>
      </div>

      <PanelBlock
        title="Tuiles"
        hint="Une tuile par case peinte, la mer comprise. Le tirage les mélange à l'intérieur de la zone."
      >
        <div className="flex flex-col gap-1">
          {TERRAIN_ORDER.map(terrain => (
            <CountStepper
              key={terrain}
              label={SPEC_TERRAIN_NAME[terrain]}
              color={terrainColor(terrain)}
              value={current.terrainCounts[terrain] ?? 0}
              onChange={count =>
                onChange(setTerrainCount(spec, board, zone, terrain, count))
              }
            />
          ))}
        </div>
        <Tally label="tuiles" have={tiles} need={current.cells.length} />
      </PanelBlock>

      <PanelBlock
        title="Jetons"
        hint="Un jeton par tuile qui en porte un : ni la mer ni le désert n'en reçoivent."
      >
        {/* Laid out across, not down: ten tokens as ten labelled lines ate the
            panel. Five per row keeps them readable in a 320px aside and reads
            2, 3, 4… straight through. */}
        <div className="grid grid-cols-5 gap-x-2 gap-y-3">
          {TOKEN_VALUES.map(token => (
            <CountStepper
              key={token}
              label={String(token)}
              layout="stack"
              value={tokens.get(token) ?? 0}
              onChange={count =>
                onChange(setTokenCount(spec, board, zone, token, count))
              }
            />
          ))}
        </div>
        <Tally
          label="jetons"
          have={current.numberTokens.length}
          need={tokenBearingCount(current.terrainCounts)}
        />
      </PanelBlock>

      <PanelBlock
        title="Ports de la zone"
        hint="Épingle les emplacements sur le plan, en mode « Ports », autant que de ports : chacun sur une case de terre certaine, le long d'une arête qui donne sur la mer. Ou n'en épingle aucun : ils seront tirés au hasard sur la côte de la zone, un par tuile."
      >
        <PortTypeFields
          bag={current.ports}
          onCount={(type, count) =>
            onChange(setPortTypeCount(spec, board, zone, type, count))
          }
        />
        {slots === 0 && portCount > 0 ? (
          <span className="text-slate-500 text-xs dark:text-slate-400">
            emplacements tirés au hasard sur la côte
          </span>
        ) : (
          <Tally label="emplacements" have={slots} need={portCount} />
        )}
      </PanelBlock>

      <PanelBlock title="Tirage">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={current.hidden === true}
            onChange={e =>
              onChange(setZoneHidden(spec, board, zone, e.target.checked))
            }
            className="h-4 w-4"
          />
          Tuiles face cachée (île de brume)
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={islands !== null}
            onChange={e =>
              onChange(
                setZoneIslands(
                  spec,
                  board,
                  zone,
                  e.target.checked ? [1, 3] : null,
                ),
              )
            }
            className="h-4 w-4"
          />
          Regrouper la terre en îles
        </label>

        {islands === null ? null : (
          <div className="flex items-center gap-2 pl-6 text-sm">
            <span className="text-zinc-500 dark:text-zinc-400">de</span>
            <input
              type="number"
              min={1}
              max={12}
              value={islands[0]}
              onChange={e => setIslands(Number(e.target.value), islands[1])}
              className="w-16 rounded-lg border border-black/10 px-2 py-1 text-sm dark:border-white/15"
            />
            <span className="text-zinc-500 dark:text-zinc-400">à</span>
            <input
              type="number"
              min={1}
              max={12}
              value={islands[1]}
              onChange={e => setIslands(islands[0], Number(e.target.value))}
              className="w-16 rounded-lg border border-black/10 px-2 py-1 text-sm dark:border-white/15"
            />
            <span className="text-zinc-500 dark:text-zinc-400">îles</span>
          </div>
        )}
      </PanelBlock>
    </div>
  );
}
