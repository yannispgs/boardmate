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

/**
 * Interactive Catan board generator: a board, a "Nouveau plateau" button, a
 * settings section (desert placement + an escape hatch to drop all rules) and a
 * recap of every placement rule. The first render is deterministic (so server
 * and client markup match), then a fresh random board is drawn on mount.
 */
export function CatanBoardGenerator() {
  const [desertInner, setDesertInner] = useState(false);
  const [desertOuter, setDesertOuter] = useState(false);
  const [ignore, setIgnore] = useState(false);
  const [board, setBoard] = useState<CatanBoard>(() => generateCatanBoard(1));

  useEffect(() => {
    setBoard(generateCatanBoard());
  }, []);

  function regen(
    over: { inner?: boolean; outer?: boolean; ignore?: boolean } = {},
  ) {
    setBoard(
      generateCatanBoard(undefined, {
        desertInnerRing: over.inner ?? desertInner,
        desertOuterRing: over.outer ?? desertOuter,
        ignoreConstraints: over.ignore ?? ignore,
      }),
    );
  }

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

      <section className={sectionClass}>
        <h2 className="text-sm font-semibold">Configuration du générateur</h2>

        <fieldset
          disabled={ignore}
          className="flex flex-col gap-1.5 disabled:opacity-50"
        >
          <legend className="mb-1 text-sm">Permettre un désert sur :</legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={desertInner}
              onChange={e => {
                setDesertInner(e.target.checked);
                regen({ inner: e.target.checked });
              }}
              className="h-4 w-4 accent-indigo-600"
            />
            la couronne intérieure
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={desertOuter}
              onChange={e => {
                setDesertOuter(e.target.checked);
                regen({ outer: e.target.checked });
              }}
              className="h-4 w-4 accent-indigo-600"
            />
            la couronne extérieure
          </label>
        </fieldset>

        <label className="mt-1 flex items-center gap-2 border-t border-black/10 pt-3 text-sm dark:border-white/10">
          <input
            type="checkbox"
            checked={ignore}
            onChange={e => {
              setIgnore(e.target.checked);
              regen({ ignore: e.target.checked });
            }}
            className="h-4 w-4 accent-indigo-600"
          />
          Ignorer les contraintes de placement
        </label>
      </section>

      <section className={`${sectionClass} text-sm`}>
        <h2 className="font-semibold">Règles de placement</h2>
        <ul className="flex list-disc flex-col gap-1 pl-4 text-zinc-600 dark:text-zinc-300">
          <li>
            Le désert est au centre par défaut (couronnes intérieure /
            extérieure activables ci-dessus).
          </li>
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
            Production équilibrée : les points sont répartis le plus
            uniformément possible entre les ressources et entre les
            intersections.
          </li>
          <li>9 ports : 4 génériques (3:1) + un port 2:1 par ressource.</li>
        </ul>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          « Ignorer les contraintes de placement » désactive toutes ces règles :
          désert et nombres deviennent totalement aléatoires.
        </p>
      </section>
    </div>
  );
}
