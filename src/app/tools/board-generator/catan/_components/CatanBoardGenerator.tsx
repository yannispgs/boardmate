"use client";

import { useEffect, useState } from "react";

import { type CatanBoard, generateCatanBoard } from "@/lib/catan/board";
import { CatanBoardSvg } from "./CatanBoardSvg";

const LEGEND: { label: string; resource: string; color: string }[] = [
  { label: "Forêt", resource: "bois", color: "#2e7d46" },
  { label: "Prairie", resource: "laine", color: "#7cb342" },
  { label: "Champs", resource: "blé", color: "#e5b731" },
  { label: "Collines", resource: "argile", color: "#c1673b" },
  { label: "Montagnes", resource: "minerai", color: "#8a929c" },
  { label: "Désert", resource: "voleur", color: "#e0cfa3" },
];

/**
 * Interactive Catan board generator: shows a balanced random board and a
 * "Nouveau plateau" button to roll another. The first render is deterministic
 * (so server and client markup match), then a fresh random board is drawn on
 * mount.
 */
export function CatanBoardGenerator() {
  const [board, setBoard] = useState<CatanBoard>(() => generateCatanBoard(1));

  useEffect(() => {
    setBoard(generateCatanBoard());
  }, []);

  return (
    <div className="flex flex-col items-center gap-6">
      <CatanBoardSvg board={board} />

      <button
        type="button"
        onClick={() => setBoard(generateCatanBoard())}
        className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white transition hover:bg-indigo-500"
      >
        🎲 Nouveau plateau
      </button>

      <div className="flex flex-col gap-3">
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
          Équilibré : <span className="font-semibold text-red-600">6</span> et{" "}
          <span className="font-semibold text-red-600">8</span> (les plus
          fréquents, en rouge) ne se touchent jamais, pas deux nombres
          identiques côte à côte, et la production est répartie le plus
          uniformément possible. Les pastilles sous chaque nombre indiquent sa
          fréquence.
        </p>
      </div>
    </div>
  );
}
