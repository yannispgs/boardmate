import {
  type CatanBoard,
  type CatanResource,
  resourceCombinations,
} from "@/lib/catan/board";

const RESOURCE: Record<CatanResource, { label: string; color: string }> = {
  wood: { label: "Bois", color: "#2e7d46" },
  brick: { label: "Argile", color: "#c1673b" },
  wool: { label: "Laine", color: "#7cb342" },
  grain: { label: "Blé", color: "#e5b731" },
  ore: { label: "Minerai", color: "#8a929c" },
};

/**
 * A quick read of the current board's structure: the total dice combinations
 * (summed pips = production chances out of 36) each resource carries, biggest
 * first, as small labelled bars. The five always add up to 58.
 */
export function BoardStructure({ board }: { board: CatanBoard }) {
  const rows = [...resourceCombinations(board.hexes)].sort(
    (a, b) => b.combos - a.combos,
  );
  const max = Math.max(1, ...rows.map(r => r.combos));

  return (
    <section className="flex w-full max-w-md flex-col gap-2 rounded-xl border border-black/10 p-4 dark:border-white/10">
      <h2 className="text-sm font-semibold">Structure du plateau</h2>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Combinaisons de dés par ressource (chances de production sur 36) — total
        58.
      </p>
      <ul className="flex flex-col gap-1.5">
        {rows.map(r => {
          const meta = RESOURCE[r.resource];

          return (
            <li key={r.resource} className="flex items-center gap-2 text-sm">
              <span className="w-16 shrink-0 text-zinc-600 dark:text-zinc-300">
                {meta.label}
              </span>
              <span className="flex-1">
                <span
                  className="block h-3 rounded"
                  style={{
                    width: `${Math.max(6, (r.combos / max) * 100)}%`,
                    backgroundColor: meta.color,
                  }}
                />
              </span>
              <span className="w-6 shrink-0 text-right font-medium tabular-nums">
                {r.combos}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
