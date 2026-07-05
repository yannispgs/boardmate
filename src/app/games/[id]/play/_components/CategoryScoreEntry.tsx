"use client";

import { useState } from "react";

import type { PlayerId, ScoreSheetItem } from "@/lib/domain";
import {
  isSubsection,
  rankBonusFor,
  sheetCategories,
} from "@/lib/game/scoring";

// Fixed columns so every framed section lines up under the same player columns
// and the whole sheet scrolls sideways as one block on a narrow phone.
const LABEL_COL = "7rem";
const PLAYER_COL = "4.25rem";

const inputClass =
  "w-11 rounded-md border border-black/15 bg-white px-1 py-1 text-right tabular-nums outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900";

/**
 * End-of-game category scoresheet as a double-entry grid — categories down the
 * left, players across the top — mirroring the game's paper score pad. Each
 * subsection is framed so you can see where a category starts and ends.
 *
 * Ranked subsections (a biome in Cascadia) show a live placement bonus glued to
 * the right of each cell as `/N` (the paper sheet's diagonally split cell): it
 * stays `/0` until every player's value for that line is in, then it's computed
 * from everyone's scores and re-computed on any later edit. The grand total
 * stays hidden until "Total final" to keep the suspense for the reveal.
 */
export function CategoryScoreEntry({
  players,
  sheet,
  onSubmit,
  onCancel,
  disabled,
}: {
  players: { id: PlayerId; name: string }[];
  sheet: ScoreSheetItem[];
  onSubmit: (values: Record<string, Record<string, number>>) => void;
  onCancel: () => void;
  disabled: boolean;
}) {
  const [raw, setRaw] = useState<Record<string, Record<string, string>>>({});

  const gridCols = `${LABEL_COL} repeat(${players.length}, ${PLAYER_COL})`;

  function setCell(playerId: PlayerId, key: string, text: string) {
    setRaw(r => ({
      ...r,
      [playerId]: { ...(r[playerId] ?? {}), [key]: text },
    }));
  }

  // Live placement bonus for one ranked line: 0 for everyone until the whole
  // row is filled, then computed from all players' values.
  function bonusFor(key: string, awards: number[]): Record<string, number> {
    const texts = players.map(pl => raw[pl.id]?.[key] ?? "");
    const complete = texts.every(t => t.trim() !== "");
    const bonuses = complete
      ? rankBonusFor(
          texts.map(t => Number.parseInt(t, 10) || 0),
          awards,
        )
      : players.map(() => 0);

    return Object.fromEntries(players.map((pl, i) => [pl.id, bonuses[i]]));
  }

  function submit() {
    const categories = sheetCategories(sheet);
    const values: Record<string, Record<string, number>> = {};

    for (const pl of players) {
      const per: Record<string, number> = {};

      for (const cat of categories) {
        const text = raw[pl.id]?.[cat.key] ?? "";
        const n = Number.parseInt(text, 10);

        if (text !== "" && Number.isFinite(n)) {
          per[cat.key] = n;
        }
      }

      values[pl.id] = per;
    }

    onSubmit(values);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Comptage des points"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="flex max-h-[90lvh] w-full max-w-md flex-col rounded-xl border border-black/10 bg-white shadow-xl dark:border-white/10 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-black/10 p-4 dark:border-white/10">
          <h2 className="text-base font-semibold">Comptage des points</h2>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-black/10 px-3 py-1 text-sm transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
          >
            Fermer
          </button>
        </div>

        <div className="overflow-auto p-3">
          <div className="w-max min-w-full">
            {/* Sticky player header. Wrapped in a transparent frame with the
                same border + padding as a Section so its columns line up
                exactly with the score cells below. */}
            <div className="sticky top-0 z-10 mb-1 bg-white pb-1 dark:bg-zinc-900">
              <div className="rounded-lg border border-transparent p-1">
                <div
                  className="grid items-end"
                  style={{ gridTemplateColumns: gridCols }}
                >
                  <span />
                  {players.map(pl => (
                    <span
                      key={pl.id}
                      title={pl.name}
                      className="truncate px-1 text-center text-xs font-semibold"
                    >
                      {pl.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {sheet.map(item =>
                isSubsection(item) ? (
                  <Section
                    key={item.label}
                    label={item.label}
                    gridCols={gridCols}
                  >
                    {item.categories.map(cat => (
                      <Row
                        key={cat.key}
                        label={cat.label}
                        players={players}
                        value={pid => raw[pid]?.[cat.key] ?? ""}
                        onChange={(pid, t) => setCell(pid, cat.key, t)}
                        bonus={
                          item.rankBonus
                            ? bonusFor(cat.key, item.rankBonus)
                            : undefined
                        }
                        disabled={disabled}
                      />
                    ))}
                  </Section>
                ) : (
                  <Section key={item.key} gridCols={gridCols}>
                    <Row
                      label={item.label}
                      players={players}
                      value={pid => raw[pid]?.[item.key] ?? ""}
                      onChange={(pid, t) => setCell(pid, item.key, t)}
                      disabled={disabled}
                    />
                  </Section>
                ),
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-black/10 p-4 dark:border-white/10">
          <button
            type="button"
            disabled={disabled}
            onClick={submit}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
          >
            Total final
          </button>
        </div>
      </div>
    </div>
  );
}

/** A framed group of scored lines (or a single standalone line). */
function Section({
  label,
  gridCols,
  children,
}: {
  label?: string;
  gridCols: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-black/15 dark:border-white/15">
      {label ? (
        <div className="border-b border-black/10 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-white/10 dark:text-zinc-400">
          {label}
        </div>
      ) : null}
      <div
        className="grid gap-y-1 p-1"
        style={{ gridTemplateColumns: gridCols }}
      >
        {children}
      </div>
    </div>
  );
}

/** One scored line: its label then a cell per player (with a `/N` bonus badge). */
function Row({
  label,
  players,
  value,
  onChange,
  bonus,
  disabled,
}: {
  label: string;
  players: { id: PlayerId; name: string }[];
  value: (playerId: PlayerId) => string;
  onChange: (playerId: PlayerId, text: string) => void;
  bonus?: Record<string, number>;
  disabled: boolean;
}) {
  return (
    <>
      <span title={label} className="min-w-0 self-center truncate px-1 text-sm">
        {label}
      </span>
      {players.map(pl => (
        <span key={pl.id} className="flex items-center justify-center">
          {/* The input stays centered in the column in every section so the
              cells align; the bonus is pinned just off the input's right edge
              (absolute, so it never shifts the input). */}
          <span className="relative">
            <input
              type="number"
              inputMode="numeric"
              value={value(pl.id)}
              onChange={e => onChange(pl.id, e.target.value)}
              disabled={disabled}
              aria-label={`${label} — ${pl.name}`}
              className={inputClass}
            />
            {bonus ? (
              <span className="-translate-y-1/2 absolute top-1/2 left-full ml-0.5 text-xs text-indigo-600 tabular-nums dark:text-indigo-400">
                /{bonus[pl.id] ?? 0}
              </span>
            ) : null}
          </span>
        </span>
      ))}
    </>
  );
}
