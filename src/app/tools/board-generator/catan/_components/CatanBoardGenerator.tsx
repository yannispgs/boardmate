"use client";

import { useEffect, useState } from "react";
import { BoardStructure } from "@/components/catan/BoardStructure";
import { BoardWarnings, WarningsBadge } from "@/components/catan/BoardWarnings";
import {
  type BoardOrientation,
  CatanBoardSvg,
} from "@/components/catan/CatanBoardSvg";
import { GeneratorSettings } from "@/components/catan/GeneratorSettings";
import { PlacementRules } from "@/components/catan/PlacementRules";
import { TerrainLegend } from "@/components/catan/TerrainLegend";
import { TERRAIN_ORDER } from "@/components/catan/terrain-labels";
import { MoveHorizontalIcon, MoveVerticalIcon } from "@/components/icons";
import { OptionPicker, type PickerOption } from "@/components/OptionPicker";
import {
  boardWarnings,
  type CatanBoard,
  type CatanVariantId,
  generateCatanBoard,
} from "@/lib/catan/board";
import {
  DEFAULT_GENERATOR_OPTIONS,
  type GeneratorOptions,
  toBoardOptions,
} from "@/lib/catan/generator-options";

/** Every terrain the base game ships: all of them but the Marins gold river. */
const TERRAINS = TERRAIN_ORDER.filter(t => t !== "gold");

const sectionClass =
  "flex w-full max-w-md flex-col gap-2 rounded-xl border border-black/10 p-4 dark:border-white/10";

/** Board sizes offered by the selector. */
const VARIANTS: PickerOption<CatanVariantId>[] = [
  { value: "base", label: "3-4 joueurs", hint: "19 tuiles" },
  { value: "extension", label: "5-6 joueurs", hint: "30 tuiles" },
];

/** The base generator's settings, plus the board size they apply to. */
interface Options extends GeneratorOptions {
  variant: CatanVariantId;
}

const DEFAULTS: Options = { ...DEFAULT_GENERATOR_OPTIONS, variant: "base" };

/**
 * Interactive Catan board generator: a board-size selector, a board, a "Nouveau
 * plateau" button, the board's structure, a legend, the generator settings
 * (behind a button, reset every visit) and a recap of the placement rules that
 * tracks those settings. The first render is deterministic (so server and client
 * markup match), then a fresh random board is drawn on mount.
 */
export function CatanBoardGenerator() {
  const [opts, setOpts] = useState<Options>(DEFAULTS);
  const [showWarnings, setShowWarnings] = useState(false);
  const [orientation, setOrientation] =
    useState<BoardOrientation>("horizontal");
  const [board, setBoard] = useState<CatanBoard>(() => generateCatanBoard(1));

  useEffect(() => {
    setBoard(generateCatanBoard());
  }, []);

  function regen(patch: Partial<Options> = {}) {
    const next = { ...opts, ...patch };
    setOpts(next);
    setBoard(generateCatanBoard(undefined, toBoardOptions(next, next.variant)));
  }

  const isExtension = opts.variant === "extension";
  const warnings = boardWarnings(board, toBoardOptions(opts, opts.variant));

  // Where the desert may land, per the current settings (for the recap below).
  const desertZone =
    opts.desertInner && opts.desertOuter
      ? "n'importe où sur le plateau"
      : opts.desertInner
        ? "au centre ou sur la couronne intérieure"
        : opts.desertOuter
          ? "au centre ou sur la couronne extérieure"
          : "au centre";

  const desertRule = isExtension ? (
    <li>
      Les 2 déserts sont placés aléatoirement
      {opts.allowAdjacentDeserts
        ? " (éventuellement adjacents)"
        : " (jamais adjacents)"}
      .
    </li>
  ) : (
    <li>Le désert est placé {desertZone}.</li>
  );

  const portRule = isExtension ? (
    <li>
      11 ports : 5 génériques (3:1) + un port 2:1 par ressource (deux pour la
      laine).
    </li>
  ) : (
    <li>9 ports : 4 génériques (3:1) + un port 2:1 par ressource.</li>
  );

  return (
    <div className="flex flex-col items-center gap-6">
      <OptionPicker
        variant="segmented"
        label="Taille du plateau"
        options={VARIANTS}
        value={opts.variant}
        onChange={variant => regen({ variant })}
      />

      <div className="relative w-full max-w-md">
        <CatanBoardSvg
          board={board}
          orientation={isExtension ? orientation : "vertical"}
        />

        {warnings.length > 0 ? (
          <WarningsBadge onClick={() => setShowWarnings(v => !v)} />
        ) : null}
      </div>

      {warnings.length > 0 && showWarnings ? (
        <BoardWarnings warnings={warnings} className={sectionClass} />
      ) : null}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => regen()}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white transition hover:bg-indigo-500"
        >
          🎲 Régénérer
        </button>

        {isExtension ? (
          <button
            type="button"
            onClick={() =>
              setOrientation(o =>
                o === "horizontal" ? "vertical" : "horizontal",
              )
            }
            aria-label={
              orientation === "horizontal"
                ? "Afficher verticalement"
                : "Afficher horizontalement"
            }
            title={
              orientation === "horizontal"
                ? "Afficher verticalement"
                : "Afficher horizontalement"
            }
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-black/15 transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
          >
            {orientation === "horizontal" ? (
              <MoveVerticalIcon className="h-5 w-5" />
            ) : (
              <MoveHorizontalIcon className="h-5 w-5" />
            )}
          </button>
        ) : null}
      </div>

      <BoardStructure board={board} />

      <TerrainLegend terrains={TERRAINS} />

      <GeneratorSettings
        options={opts}
        onChange={regen}
        deserts={isExtension ? "pair" : "rings"}
      />

      <PlacementRules
        title="Règles de placement appliquées"
        options={opts}
        head={desertRule}
        tail={portRule}
      />
    </div>
  );
}
