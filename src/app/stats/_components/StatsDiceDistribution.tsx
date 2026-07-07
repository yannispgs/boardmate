import type { DiceSpec } from "@/lib/domain";
import { diceDeviations, diceValues } from "@/lib/game/dice";

const TRACK = 96; // px for the tallest bar
const STUB = 4; // min height so empty values stay visible

const LUCK_BAR: Record<string, string> = {
  over: "bg-emerald-500",
  under: "bg-red-500",
  even: "bg-indigo-500",
};

/**
 * Aggregated dice distribution over the selected parties: one bar per possible
 * value, height ∝ how often it came up, tinted by luck (green above the odds,
 * red below, indigo within ±10%). The expected-vs-observed gap makes a loaded
 * table jump out across many games, not just one.
 */
export function StatsDiceDistribution({
  rolls,
  spec,
}: {
  rolls: number[];
  spec: DiceSpec;
}) {
  const values = diceValues(spec);
  const dev = diceDeviations(rolls, spec);
  const byValue = new Map(dev.map(d => [d.value, d]));
  const maxCount = Math.max(1, ...dev.map(d => d.count));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end justify-between gap-1">
        {values.map(value => {
          const d = byValue.get(value);
          const count = d?.count ?? 0;
          const height = STUB + (count / maxCount) * (TRACK - STUB);

          return (
            <div
              key={value}
              className="flex flex-1 flex-col items-center justify-end gap-1"
            >
              <span className="text-[10px] text-zinc-400 tabular-nums leading-none">
                {count || ""}
              </span>
              <span
                className={`w-full rounded-t ${LUCK_BAR[d?.luck ?? "even"]}`}
                style={{ height }}
              />
              <span className="text-xs font-medium tabular-nums">{value}</span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {rolls.length} lancer{rolls.length > 1 ? "s" : ""} · vert = plus que la
        moyenne attendue, rouge = moins.
      </p>
    </div>
  );
}
