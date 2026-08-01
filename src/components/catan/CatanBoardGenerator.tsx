"use client";

import { useEffect, useState } from "react";

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
import { BoardStructure } from "./BoardStructure";
import { BoardWarnings, WarningsBadge } from "./BoardWarnings";
import { type BoardOrientation, CatanBoardSvg } from "./CatanBoardSvg";
import { GeneratorSettings } from "./GeneratorSettings";
import { PlacementRules } from "./PlacementRules";
import { TerrainLegend } from "./TerrainLegend";
import { TERRAIN_ORDER } from "./terrain-labels";

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

/** The settings a board starts from, at the size it is drawn at. */
function defaultsFor(size: CatanVariantId | undefined): Options {
  return { ...DEFAULT_GENERATOR_OPTIONS, variant: size ?? "base" };
}

/** Where the desert is allowed to land, in words, per the settings in force. */
function desertZoneOf(opts: GeneratorOptions): string {
  if (opts.desertInner && opts.desertOuter) {
    return "n'importe où sur le plateau";
  }

  if (opts.desertInner) {
    return "au centre ou sur la couronne intérieure";
  }

  if (opts.desertOuter) {
    return "au centre ou sur la couronne extérieure";
  }

  return "au centre";
}

/** The desert rule of the recap: one desert to place, or the pair of them. */
function desertRuleOf(opts: Options): React.ReactNode {
  if (opts.variant !== "extension") {
    return <li>Le désert est placé {desertZoneOf(opts)}.</li>;
  }

  return (
    <li>
      Les 2 déserts sont placés aléatoirement
      {opts.allowAdjacentDeserts
        ? " (éventuellement adjacents)"
        : " (jamais adjacents)"}
      .
    </li>
  );
}

/** The port rule of the recap — the bigger board ships two more harbours. */
function portRuleOf(isExtension: boolean): React.ReactNode {
  return isExtension ? (
    <li>
      11 ports : 5 génériques (3:1) + un port 2:1 par ressource (deux pour la
      laine).
    </li>
  ) : (
    <li>9 ports : 4 génériques (3:1) + un port 2:1 par ressource.</li>
  );
}

/**
 * Turns the 5–6 player board a quarter turn. That one is wider than it is tall,
 * so which way round it reads best depends on the screen it is read on.
 */
function OrientationToggle({
  orientation,
  onToggle,
}: Readonly<{ orientation: BoardOrientation; onToggle: () => void }>) {
  const label =
    orientation === "horizontal"
      ? "Afficher verticalement"
      : "Afficher horizontalement";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      title={label}
      className="flex h-11 w-11 items-center justify-center rounded-lg border border-black/15 transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
    >
      {orientation === "horizontal" ? (
        <MoveVerticalIcon className="h-5 w-5" />
      ) : (
        <MoveHorizontalIcon className="h-5 w-5" />
      )}
    </button>
  );
}

/**
 * Interactive Catan board generator: a board-size selector, a board, a "Nouveau
 * plateau" button, the board's structure, a legend, the generator settings
 * (behind a button, reset every visit) and a recap of the placement rules that
 * tracks those settings. The first render is deterministic (so server and client
 * markup match), then a fresh random board is drawn on mount.
 */
export function CatanBoardGenerator({
  size,
}: Readonly<{
  /**
   * The size to draw at, which also takes the selector away. The new-game
   * funnel knows how many players are sat down, so the board it offers them is
   * the one their game is played on rather than one more thing to pick.
   */
  size?: CatanVariantId;
}>) {
  const [opts, setOpts] = useState<Options>(() => defaultsFor(size));
  const [showWarnings, setShowWarnings] = useState(false);
  const [orientation, setOrientation] =
    useState<BoardOrientation>("horizontal");
  const [board, setBoard] = useState<CatanBoard>(() =>
    generateCatanBoard(1, toBoardOptions(defaultsFor(size), size ?? "base")),
  );

  useEffect(() => {
    const start = defaultsFor(size);

    setOpts(start);
    setBoard(
      generateCatanBoard(undefined, toBoardOptions(start, start.variant)),
    );
  }, [size]);

  function regen(patch: Partial<Options> = {}) {
    const next = { ...opts, ...patch };
    setOpts(next);
    setBoard(generateCatanBoard(undefined, toBoardOptions(next, next.variant)));
  }

  const isExtension = opts.variant === "extension";
  const warnings = boardWarnings(board, toBoardOptions(opts, opts.variant));

  return (
    <div className="flex flex-col items-center gap-6">
      {size === undefined ? (
        <OptionPicker
          variant="segmented"
          label="Taille du plateau"
          options={VARIANTS}
          value={opts.variant}
          onChange={variant => regen({ variant })}
        />
      ) : null}

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
          <OrientationToggle
            orientation={orientation}
            onToggle={() =>
              setOrientation(o =>
                o === "horizontal" ? "vertical" : "horizontal",
              )
            }
          />
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
        head={desertRuleOf(opts)}
        tail={portRuleOf(isExtension)}
      />
    </div>
  );
}
