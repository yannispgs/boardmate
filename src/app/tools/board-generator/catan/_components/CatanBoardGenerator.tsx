"use client";

import { useEffect, useState } from "react";
import {
  RectangleHorizontalIcon,
  RectangleVerticalIcon,
} from "@/components/icons";
import {
  type BoardOptions,
  type BoardWarning,
  boardWarnings,
  type CatanBoard,
  type CatanResource,
  type CatanVariantId,
  generateCatanBoard,
} from "@/lib/catan/board";
import { BoardStructure } from "./BoardStructure";
import { type BoardOrientation, CatanBoardSvg } from "./CatanBoardSvg";

const RESOURCE_LABEL: Record<CatanResource, string> = {
  wood: "bois",
  brick: "argile",
  wool: "laine",
  grain: "blé",
  ore: "minerai",
};

/** A single unmet placement rule, phrased for the player. */
function warningText(w: BoardWarning): string {
  switch (w.kind) {
    case "intersectionTooStrong": {
      const plural = w.count > 1;

      return `${w.count} intersection${plural ? "s" : ""} dépasse${
        plural ? "nt" : ""
      } le plafond de ${w.max} pastilles (jusqu'à ${w.worst}).`;
    }
    case "resourceBalance": {
      return `La production de ${RESOURCE_LABEL[w.resource]} sort de l'équilibre visé (${w.combos} combinaisons pour une cible de ${Math.round(w.low)} à ${Math.round(w.high)}).`;
    }
    default: {
      return `Un port 2:1 est adjacent à une tuile de sa ressource (${w.resources
        .map(r => RESOURCE_LABEL[r])
        .join(", ")}).`;
    }
  }
}

const LEGEND: { label: string; resource: string; color: string }[] = [
  { label: "Forêt", resource: "bois", color: "#2e7d46" },
  { label: "Prairie", resource: "laine", color: "#7cb342" },
  { label: "Champs", resource: "blé", color: "#e5b731" },
  { label: "Collines", resource: "argile", color: "#c1673b" },
  { label: "Montagnes", resource: "minerai", color: "#8a929c" },
  { label: "Désert", resource: "voleur", color: "#e0cfa3" },
];

const sectionClass =
  "flex w-full max-w-md flex-col gap-2 rounded-xl border border-black/10 p-4 dark:border-white/10";

/** Board sizes offered by the selector. */
const VARIANTS: { id: CatanVariantId; label: string; hint: string }[] = [
  { id: "base", label: "3-4 joueurs", hint: "19 tuiles" },
  { id: "extension", label: "5-6 joueurs", hint: "30 tuiles" },
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
      <div className="flex rounded-lg border border-black/10 p-1 dark:border-white/10">
        {VARIANTS.map(v => {
          const active = opts.variant === v.id;

          return (
            <button
              key={v.id}
              type="button"
              onClick={() => regen({ variant: v.id })}
              aria-pressed={active}
              className={`flex flex-col items-center rounded-md px-4 py-1.5 text-sm font-medium transition ${
                active
                  ? "bg-indigo-600 text-white"
                  : "text-zinc-600 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/5"
              }`}
            >
              {v.label}
              <span
                className={`text-[11px] ${active ? "text-white/80" : "text-zinc-400"}`}
              >
                {v.hint}
              </span>
            </button>
          );
        })}
      </div>

      <div className="relative w-full max-w-md">
        <CatanBoardSvg
          board={board}
          orientation={isExtension ? orientation : "vertical"}
        />

        {warnings.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowWarnings(v => !v)}
            aria-label="Voir les règles de placement non respectées"
            className="absolute right-0 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-lg shadow ring-1 ring-amber-400 transition hover:bg-amber-200 dark:bg-amber-950 dark:ring-amber-600"
          >
            ⚠️
          </button>
        ) : null}
      </div>

      {warnings.length > 0 && showWarnings ? (
        <section
          className={`${sectionClass} border-amber-400/60 bg-amber-50 text-sm dark:bg-amber-950/40`}
        >
          <h2 className="font-semibold">
            ⚠️ Règles non garanties sur ce plateau
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-300">
            Le générateur fait au mieux : ce plateau respecte les contraintes
            strictes, mais pas les règles souples ci-dessous. Retire un nouveau
            plateau pour retenter.
          </p>
          <ul className="flex list-disc flex-col gap-1 pl-4 text-zinc-700 dark:text-zinc-200">
            {warnings.map(w => (
              <li
                key={
                  w.kind === "resourceBalance" ? `bal-${w.resource}` : w.kind
                }
              >
                {warningText(w)}
              </li>
            ))}
          </ul>
        </section>
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
              <RectangleVerticalIcon className="h-5 w-5" />
            ) : (
              <RectangleHorizontalIcon className="h-5 w-5" />
            )}
          </button>
        ) : null}
      </div>

      <BoardStructure board={board} />

      <div className="flex flex-col gap-2">
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
          {LEGEND.map(item => (
            <li key={item.label} className="flex items-center gap-2">
              <span
                aria-hidden
                className="h-3.5 w-3.5 shrink-0 rounded-sm border border-black/10"
                style={{ backgroundColor: item.color }}
              />
              <span>
                {item.label}{" "}
                <span className="text-zinc-500 dark:text-zinc-400">
                  ({item.resource})
                </span>
              </span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Les pastilles sous chaque nombre indiquent sa fréquence de sortie.
        </p>
      </div>

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
