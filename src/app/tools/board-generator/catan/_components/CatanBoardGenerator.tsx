"use client";

import { useEffect, useState } from "react";

import { type CatanBoard, generateCatanBoard } from "@/lib/catan/board";
import { BoardStructure } from "./BoardStructure";
import { CatanBoardSvg } from "./CatanBoardSvg";

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

/** Generator settings — session-only (they reset to these on every visit). */
interface Options {
  desertInner: boolean;
  desertOuter: boolean;
  ignore: boolean;
  /** Allowed deviation from each resource's balanced share, in percent. */
  tolerancePct: number;
}

const DEFAULTS: Options = {
  desertInner: false,
  desertOuter: false,
  ignore: false,
  tolerancePct: 25,
};

/**
 * Interactive Catan board generator: a board, a "Nouveau plateau" button, the
 * board's structure, a legend, the generator settings (behind a button, reset
 * every visit) and a recap of the placement rules. The first render is
 * deterministic (so server and client markup match), then a fresh random board
 * is drawn on mount.
 */
export function CatanBoardGenerator() {
  const [opts, setOpts] = useState<Options>(DEFAULTS);
  const [showConfig, setShowConfig] = useState(false);
  const [board, setBoard] = useState<CatanBoard>(() => generateCatanBoard(1));

  useEffect(() => {
    setBoard(generateCatanBoard());
  }, []);

  function regen(patch: Partial<Options> = {}) {
    const next = { ...opts, ...patch };
    setOpts(next);
    setBoard(
      generateCatanBoard(undefined, {
        desertInnerRing: next.desertInner,
        desertOuterRing: next.desertOuter,
        ignoreConstraints: next.ignore,
        balanceTolerance: next.tolerancePct / 100,
      }),
    );
  }

  // Where the desert may land, per the current settings (for the recap below).
  const desertZone =
    opts.desertInner && opts.desertOuter
      ? "n'importe où sur le plateau"
      : opts.desertInner
        ? "au centre ou sur la couronne intérieure"
        : opts.desertOuter
          ? "au centre ou sur la couronne extérieure"
          : "au centre";

  return (
    <div className="flex flex-col items-center gap-6">
      <CatanBoardSvg board={board} />

      <button
        type="button"
        onClick={() => regen()}
        className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white transition hover:bg-indigo-500"
      >
        🎲 Nouveau plateau
      </button>

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
            className="flex flex-col gap-3 disabled:opacity-50"
          >
            <div className="flex flex-col gap-1.5">
              <legend className="text-sm">Permettre un désert sur :</legend>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={opts.desertInner}
                  onChange={e => regen({ desertInner: e.target.checked })}
                  className="h-4 w-4 accent-indigo-600"
                />
                la couronne intérieure
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={opts.desertOuter}
                  onChange={e => regen({ desertOuter: e.target.checked })}
                  className="h-4 w-4 accent-indigo-600"
                />
                la couronne extérieure
              </label>
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
                De chaque ressource par rapport à sa part équilibrée. 0 % =
                parts strictement égales ; plus haut = plus de variété.
              </span>
            </label>
          </fieldset>

          <label className="mt-1 flex items-center gap-2 border-t border-black/10 pt-3 text-sm dark:border-white/10">
            <input
              type="checkbox"
              checked={opts.ignore}
              onChange={e => regen({ ignore: e.target.checked })}
              className="h-4 w-4 accent-indigo-600"
            />
            Ignorer les contraintes de placement
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
            <li>Le désert est placé {desertZone}.</li>
            <li>
              Jamais de triangle de même ressource, et les regroupements de 3
              tuiles identiques ou plus sont évités (ressources réparties).
            </li>
            <li>
              Les nombres rouges{" "}
              <span className="font-semibold text-red-600">6</span> et{" "}
              <span className="font-semibold text-red-600">8</span> (les plus
              fréquents) ne sont jamais adjacents.
            </li>
            <li>Deux nombres identiques ne sont jamais adjacents.</li>
            <li>
              {opts.tolerancePct === 0
                ? "Production strictement équilibrée : chaque ressource a exactement sa part attendue."
                : `Production équilibrée : chaque ressource reste à ±${opts.tolerancePct} % de sa part attendue — de quoi garder de la variété.`}
            </li>
            <li>9 ports : 4 génériques (3:1) + un port 2:1 par ressource.</li>
          </ul>
        )}
      </section>
    </div>
  );
}
