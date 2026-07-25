"use client";

import { useEffect, useState } from "react";
import { BoardStructure } from "@/components/catan/BoardStructure";
import { BoardWarnings, WarningsBadge } from "@/components/catan/BoardWarnings";
import {
  type BoardOrientation,
  CatanBoardSvg,
} from "@/components/catan/CatanBoardSvg";
import {
  type SegmentedOption,
  SegmentedPicker,
} from "@/components/catan/SegmentedPicker";
import { TerrainLegend } from "@/components/catan/TerrainLegend";
import { MoveHorizontalIcon, MoveVerticalIcon } from "@/components/icons";
import {
  type BoardOptions,
  boardWarnings,
  type CatanBoard,
  type CatanTerrain,
  type CatanVariantId,
  generateCatanBoard,
} from "@/lib/catan/board";

/** Every terrain the base game ships, in legend order. */
const TERRAINS: CatanTerrain[] = [
  "forest",
  "pasture",
  "fields",
  "hills",
  "mountains",
  "desert",
];

const sectionClass =
  "flex w-full max-w-md flex-col gap-2 rounded-xl border border-black/10 p-4 dark:border-white/10";

/** Board sizes offered by the selector. */
const VARIANTS: SegmentedOption<CatanVariantId>[] = [
  { value: "base", label: "3-4 joueurs", hint: "19 tuiles" },
  { value: "extension", label: "5-6 joueurs", hint: "30 tuiles" },
];

/** Generator settings — session-only (they reset to these on every visit). */
interface Options {
  variant: CatanVariantId;
  desertInner: boolean;
  desertOuter: boolean;
  allowAdjacentDeserts: boolean;
  ignore: boolean;
  /** Allowed deviation from each resource's balanced share, in percent. */
  tolerancePct: number;
  avoidReds: boolean;
  avoidDuplicates: boolean;
  avoidClusters: boolean;
  balanceInter: boolean;
  penalizeVariance: boolean;
  limitInterPips: boolean;
  maxInterPips: number;
  avoidPortRes: boolean;
  terrainN: number;
  numberN: number;
}

const DEFAULTS: Options = {
  variant: "base",
  desertInner: false,
  desertOuter: false,
  allowAdjacentDeserts: false,
  ignore: false,
  tolerancePct: 20,
  avoidReds: true,
  avoidDuplicates: true,
  avoidClusters: true,
  balanceInter: true,
  penalizeVariance: true,
  limitInterPips: true,
  maxInterPips: 12,
  avoidPortRes: false,
  terrainN: 60,
  numberN: 75,
};

/** Maps the session settings to the generator's option shape. */
function toBoardOptions(o: Options): BoardOptions {
  return {
    variant: o.variant,
    desertInnerRing: o.desertInner,
    desertOuterRing: o.desertOuter,
    allowAdjacentDeserts: o.allowAdjacentDeserts,
    ignoreConstraints: o.ignore,
    balanceTolerance: o.tolerancePct / 100,
    avoidAdjacentReds: o.avoidReds,
    avoidAdjacentDuplicates: o.avoidDuplicates,
    avoidResourceClusters: o.avoidClusters,
    balanceIntersections: o.balanceInter,
    penalizeResourceVariance: o.penalizeVariance,
    limitIntersectionPips: o.limitInterPips,
    maxIntersectionPips: o.maxInterPips,
    avoidPortOnResource: o.avoidPortRes,
    terrainCandidates: o.terrainN,
    numberCandidates: o.numberN,
  };
}

/** A labelled checkbox, to keep the settings panel readable. */
function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="h-4 w-4 shrink-0 accent-indigo-600"
      />
      {label}
    </label>
  );
}

/**
 * Interactive Catan board generator: a board-size selector, a board, a "Nouveau
 * plateau" button, the board's structure, a legend, the generator settings
 * (behind a button, reset every visit) and a recap of the placement rules that
 * tracks those settings. The first render is deterministic (so server and client
 * markup match), then a fresh random board is drawn on mount.
 */
export function CatanBoardGenerator() {
  const [opts, setOpts] = useState<Options>(DEFAULTS);
  const [showConfig, setShowConfig] = useState(false);
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
    setBoard(generateCatanBoard(undefined, toBoardOptions(next)));
  }

  const isExtension = opts.variant === "extension";
  const warnings = boardWarnings(board, toBoardOptions(opts));

  // Where the desert may land, per the current settings (for the recap below).
  const desertZone =
    opts.desertInner && opts.desertOuter
      ? "n'importe où sur le plateau"
      : opts.desertInner
        ? "au centre ou sur la couronne intérieure"
        : opts.desertOuter
          ? "au centre ou sur la couronne extérieure"
          : "au centre";

  const numField =
    "w-20 rounded-lg border border-black/15 bg-white px-2 py-1 outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900";

  return (
    <div className="flex flex-col items-center gap-6">
      <SegmentedPicker
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
          🎲 Nouveau plateau
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

      {showConfig ? (
        <section className={sectionClass}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Paramètres du générateur</h2>
            <button
              type="button"
              onClick={() => setShowConfig(false)}
              className="text-xs text-zinc-500 transition hover:underline"
            >
              Masquer
            </button>
          </div>

          <fieldset
            disabled={opts.ignore}
            className="flex flex-col gap-4 disabled:opacity-50"
          >
            {isExtension ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Déserts</span>
                <Check
                  label="Autoriser les deux déserts adjacents"
                  checked={opts.allowAdjacentDeserts}
                  onChange={v => regen({ allowAdjacentDeserts: v })}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">
                  Permettre un désert sur :
                </span>
                <Check
                  label="la couronne intérieure"
                  checked={opts.desertInner}
                  onChange={v => regen({ desertInner: v })}
                />
                <Check
                  label="la couronne extérieure"
                  checked={opts.desertOuter}
                  onChange={v => regen({ desertOuter: v })}
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Contraintes</span>
              <Check
                label="Pas de 6/8 adjacents"
                checked={opts.avoidReds}
                onChange={v => regen({ avoidReds: v })}
              />
              <Check
                label="Pas de nombres identiques adjacents"
                checked={opts.avoidDuplicates}
                onChange={v => regen({ avoidDuplicates: v })}
              />
              <Check
                label="Éviter les paquets de ressources identiques"
                checked={opts.avoidClusters}
                onChange={v => regen({ avoidClusters: v })}
              />
              <Check
                label="Équilibrer les intersections"
                checked={opts.balanceInter}
                onChange={v => regen({ balanceInter: v })}
              />
              <Check
                label="Éviter les ressources trop concentrées"
                checked={opts.penalizeVariance}
                onChange={v => regen({ penalizeVariance: v })}
              />
              <Check
                label="Pas de port 2:1 adjacent à sa ressource"
                checked={opts.avoidPortRes}
                onChange={v => regen({ avoidPortRes: v })}
              />
            </div>

            <label className="flex flex-col gap-1 text-sm">
              <span>Écart de production toléré : ±{opts.tolerancePct} %</span>
              <input
                type="range"
                min={0}
                max={60}
                step={5}
                value={opts.tolerancePct}
                onChange={e => regen({ tolerancePct: Number(e.target.value) })}
                aria-label="Écart de production toléré en pourcentage"
                className="accent-indigo-600"
              />
              <span className="text-[11px] text-zinc-400">
                De chaque ressource par rapport à sa part attendue (∝ à son
                nombre de tuiles). 0 % = parts strictement égales ; plus haut =
                plus de variété.
              </span>
            </label>

            <div className="flex flex-col gap-2">
              <Check
                label="Limiter la force d'une intersection"
                checked={opts.limitInterPips}
                onChange={v => regen({ limitInterPips: v })}
              />
              {opts.limitInterPips ? (
                <label className="flex items-center gap-1.5 pl-6 text-sm">
                  Maximum
                  <input
                    type="number"
                    min={3}
                    max={15}
                    value={opts.maxInterPips}
                    onChange={e =>
                      regen({ maxInterPips: Number(e.target.value) || 0 })
                    }
                    aria-label="Pips maximum par intersection"
                    className={numField}
                  />
                  pastilles
                </label>
              ) : null}
              <span className="pl-6 text-[11px] text-zinc-400">
                Somme des pastilles aux sommets où 3 tuiles se rejoignent : un
                plafond évite les emplacements surpuissants en début de partie
                (les intersections faibles, elles, ne gênent pas).
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">
                Candidats évalués (qualité ↔ variété)
              </span>
              <label className="flex items-center justify-between gap-2 text-sm">
                Terrains
                <input
                  type="number"
                  min={1}
                  max={300}
                  value={opts.terrainN}
                  onChange={e =>
                    regen({
                      terrainN: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                  aria-label="Nombre de candidats terrain"
                  className={numField}
                />
              </label>
              <label className="flex items-center justify-between gap-2 text-sm">
                Nombres
                <input
                  type="number"
                  min={1}
                  max={300}
                  value={opts.numberN}
                  onChange={e =>
                    regen({ numberN: Math.max(1, Number(e.target.value) || 1) })
                  }
                  aria-label="Nombre de candidats nombres"
                  className={numField}
                />
              </label>
            </div>
          </fieldset>

          <label className="mt-1 flex items-center gap-2 border-t border-black/10 pt-3 text-sm dark:border-white/10">
            <input
              type="checkbox"
              checked={opts.ignore}
              onChange={e => regen({ ignore: e.target.checked })}
              className="h-4 w-4 shrink-0 accent-indigo-600"
            />
            Ignorer toutes les contraintes de placement
          </label>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setShowConfig(true)}
          className="rounded-lg border border-black/15 px-4 py-2 text-sm font-medium transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
        >
          ⚙️ Configurer les paramètres du générateur
        </button>
      )}

      <section className={`${sectionClass} text-sm`}>
        <h2 className="font-semibold">Règles de placement appliquées</h2>
        {opts.ignore ? (
          <p className="text-zinc-600 dark:text-zinc-300">
            Contraintes <span className="font-semibold">désactivées</span> — le
            plateau est totalement aléatoire : le désert peut tomber
            n&apos;importe où, et les ressources comme les nombres ne suivent
            aucune règle.
          </p>
        ) : (
          <ul className="flex list-disc flex-col gap-1 pl-4 text-zinc-600 dark:text-zinc-300">
            {isExtension ? (
              <li>
                Les 2 déserts sont placés aléatoirement
                {opts.allowAdjacentDeserts
                  ? " (éventuellement adjacents)"
                  : " (jamais adjacents)"}
                .
              </li>
            ) : (
              <li>Le désert est placé {desertZone}.</li>
            )}
            <li>
              Jamais de triangle de trois tuiles de même ressource
              {opts.avoidClusters
                ? ", et les terrains identiques sont peu regroupés (pas de gros paquet, au plus ~3 paires adjacentes)"
                : " (les paquets et paires de terrains identiques restent permis)"}
              .
            </li>
            {opts.avoidReds ? (
              <li>
                Les nombres rouges{" "}
                <span className="font-semibold text-red-600">6</span> et{" "}
                <span className="font-semibold text-red-600">8</span> ne sont
                jamais adjacents.
              </li>
            ) : null}
            {opts.avoidDuplicates ? (
              <li>Deux nombres identiques ne sont jamais adjacents.</li>
            ) : null}
            <li>
              {opts.tolerancePct === 0
                ? "Production strictement équilibrée : chaque ressource a exactement sa part attendue"
                : `Production équilibrée : chaque ressource reste à ±${opts.tolerancePct} % de sa part attendue`}
              {opts.balanceInter
                ? ", et la production est étalée entre les intersections."
                : "."}
            </li>
            {opts.penalizeVariance ? (
              <li>
                Aucune ressource n&apos;est trop concentrée sur une seule tuile
                (production répartie sur ses tuiles).
              </li>
            ) : null}
            {opts.limitInterPips ? (
              <li>
                Aucune intersection ne dépasse {opts.maxInterPips} pastilles —
                pas d&apos;emplacement surpuissant en début de partie.
              </li>
            ) : null}
            {opts.avoidPortRes ? (
              <li>
                Aucun port 2:1 adjacent à une tuile de sa propre ressource.
              </li>
            ) : null}
            {isExtension ? (
              <li>
                11 ports : 5 génériques (3:1) + un port 2:1 par ressource (deux
                pour la laine).
              </li>
            ) : (
              <li>9 ports : 4 génériques (3:1) + un port 2:1 par ressource.</li>
            )}
          </ul>
        )}
      </section>
    </div>
  );
}
