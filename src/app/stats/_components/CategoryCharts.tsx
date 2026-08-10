"use client";

import { useState } from "react";

import type { GameStatsRecord, PlayerId, ScoreSheetItem } from "@/lib/domain";
import {
  categorySlices,
  detailSubsections,
  groupSlices,
  type Slice,
  usableBreakdowns,
} from "@/lib/game/category-stats";

/** An SVG donut of the slices with a labelled legend (mean points + share). */
function Donut({ slices }: { slices: Slice[] }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const r = 42;
  const c = 2 * Math.PI * r;
  let before = 0;

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="h-28 w-28 shrink-0 -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          strokeWidth="14"
          className="stroke-black/5 dark:stroke-white/10"
        />
        {total > 0
          ? slices.map(s => {
              const len = (s.value / total) * c;
              const offset = -((before / total) * c);
              before += s.value;

              return (
                <circle
                  key={s.label}
                  cx="50"
                  cy="50"
                  r={r}
                  fill="none"
                  strokeWidth="14"
                  stroke={s.color}
                  strokeDasharray={`${len} ${c}`}
                  strokeDashoffset={offset}
                />
              );
            })
          : null}
      </svg>
      <ul className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
        {slices.map(s => (
          <li key={s.label} className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-3 shrink-0 rounded-full"
              style={{ background: s.color }}
            />
            <span className="min-w-0 flex-1 truncate">{s.label}</span>
            <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
              {s.value.toFixed(1)}
              {total > 0 ? ` · ${Math.round((s.value / total) * 100)}%` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Colour key shared by the comparison bars (which have no inline labels). */
function Legend({ slices }: { slices: Slice[] }) {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
      {slices.map(s => (
        <li key={s.label} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-2.5 rounded-full"
            style={{ background: s.color }}
          />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

/** One 100%-wide bar per player, split by category share, with their total. */
function StackedBars({
  bars,
}: {
  bars: Array<{ label: string; slices: Slice[] }>;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {bars.map(bar => {
        const total = bar.slices.reduce((s, x) => s + x.value, 0);

        return (
          <li key={bar.label} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="min-w-0 truncate font-medium">{bar.label}</span>
              <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
                {total.toFixed(0)} pts
              </span>
            </div>
            <div className="flex h-4 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
              {total > 0
                ? bar.slices.map(s =>
                    s.value > 0 ? (
                      <span
                        key={s.label}
                        title={`${s.label} : ${s.value.toFixed(1)}`}
                        style={{
                          width: `${(s.value / total) * 100}%`,
                          background: s.color,
                        }}
                      />
                    ) : null,
                  )
                : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Category point-distribution for any game scored by category: a donut of the
 * mean split (over games with a complete breakdown), toggling between the
 * top-level view ("Globale" — the sheet's sections, or its lines when it has
 * none) and one tab per section the game asked to detail ("Animaux"). With
 * `comparePlayers` (a handful selected on the games tab) it shows one stacked
 * bar per player instead of the aggregate donut. Renders nothing when no game
 * in scope has a complete breakdown.
 */
export function CategoryCharts({
  sheet,
  records,
  playerId,
  comparePlayers,
}: {
  sheet: ScoreSheetItem[];
  records: GameStatsRecord[];
  /** Restrict the aggregate to one player (the player detail view). */
  playerId?: PlayerId;
  /** Show a bar per player instead of the donut (any players filtered in). */
  comparePlayers?: Array<{ id: PlayerId; name: string }>;
}) {
  const subs = detailSubsections(sheet);
  // -1 is the top-level split; 0..n-1 pick a subsection to break down.
  const [view, setView] = useState(-1);
  const detailed = subs[view] ?? null;

  function slicesOf(breakdowns: Record<string, number>[]): Slice[] {
    return detailed
      ? categorySlices(detailed.categories, breakdowns)
      : groupSlices(sheet, breakdowns);
  }

  const bars =
    comparePlayers?.map(p => ({
      label: p.name,
      slices: slicesOf(usableBreakdowns(records, sheet, p.id)),
    })) ?? null;

  const aggregate = bars
    ? null
    : slicesOf(usableBreakdowns(records, sheet, playerId));

  // Nothing to show when no game in scope has the full breakdown.
  const hasData = bars
    ? bars.some(b => b.slices.some(s => s.value > 0))
    : (aggregate?.some(s => s.value > 0) ?? false);

  if (!hasData) {
    return (
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Aucune partie avec le détail complet des points.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {subs.length > 0 ? (
        <div className="flex justify-end">
          <div className="inline-flex flex-wrap overflow-hidden rounded-lg border border-black/10 text-xs dark:border-white/10">
            {[{ label: "Globale" }, ...subs].map((tab, i) => {
              const index = i - 1;

              return (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => setView(index)}
                  className={`px-2.5 py-1 font-medium transition ${
                    view === index
                      ? "bg-indigo-600 text-white"
                      : "hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {bars ? (
        <div className="flex flex-col gap-2">
          <StackedBars bars={bars} />
          <Legend slices={bars[0].slices} />
        </div>
      ) : aggregate ? (
        <Donut slices={aggregate} />
      ) : null}
    </div>
  );
}
