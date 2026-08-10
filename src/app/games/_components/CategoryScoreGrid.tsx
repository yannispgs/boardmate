"use client";

import { CategoryIcon } from "@/components/CategoryIcon";
import { ScoreSheetLegend } from "@/components/ScoreSheetLegend";
import type { CategoryDef, PlayerId, ScoreSheetItem } from "@/lib/domain";
import { categoryIconOf } from "@/lib/game/category-icons";
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
  "no-spinners w-11 rounded-md border border-black/15 bg-white px-1 py-1 text-right tabular-nums outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900";

/** Per-player raw text entered per category key. */
export type CategoryRaw = Record<string, Record<string, string>>;

/** How many cells are still empty (a forgotten score) across the whole sheet. */
export function gridRemaining(
  players: { id: PlayerId }[],
  sheet: ScoreSheetItem[],
  raw: CategoryRaw,
): number {
  const categories = sheetCategories(sheet);

  return players.reduce(
    (n, pl) =>
      n +
      categories.filter(
        c => !Number.isFinite(Number.parseInt(raw[pl.id]?.[c.key] ?? "", 10)),
      ).length,
    0,
  );
}

/** The filled cells as numbers, keyed by player then category (empties dropped). */
export function gridValues(
  players: { id: PlayerId }[],
  sheet: ScoreSheetItem[],
  raw: CategoryRaw,
): Record<string, Record<string, number>> {
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

  return values;
}

/**
 * The end-of-game category scoresheet as a double-entry grid — categories down
 * the left, players across the top — mirroring the game's paper score pad. Each
 * subsection is framed so you can see where a category starts and ends.
 * Controlled: the parent owns the raw values and decides the surrounding chrome
 * (a modal reveal, or an inline form). Ranked subsections show a live placement
 * bonus (`/N`) once a whole line is filled.
 */
export function CategoryScoreGrid({
  players,
  sheet,
  raw,
  onCell,
  disabled,
}: Readonly<{
  players: { id: PlayerId; name: string }[];
  sheet: ScoreSheetItem[];
  raw: CategoryRaw;
  onCell: (playerId: PlayerId, key: string, text: string) => void;
  disabled: boolean;
}>) {
  const gridCols = `${LABEL_COL} repeat(${players.length}, ${PLAYER_COL})`;

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

  return (
    <div className="overflow-auto">
      <div className="w-max min-w-full">
        {/* Sticky player header, framed like a Section so its columns line up
            exactly with the score cells below. */}
        <div className="sticky top-0 z-10 mb-1 bg-white pb-1 dark:bg-zinc-900">
          <div className="rounded-lg border border-transparent p-1">
            <div
              className="grid items-end"
              style={{ gridTemplateColumns: gridCols }}
            >
              {/* The empty corner over the category column: where the legend
                  of the sheet's pictograms lives, right above the lines it
                  explains. */}
              <span className="sticky left-0 z-20 flex items-end self-stretch bg-white px-1 dark:bg-zinc-900">
                <ScoreSheetLegend sheet={sheet} />
              </span>
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
              <Section key={item.label} label={item.label} gridCols={gridCols}>
                {item.categories.map(cat => (
                  <Row
                    key={cat.key}
                    category={cat}
                    players={players}
                    value={pid => raw[pid]?.[cat.key] ?? ""}
                    onChange={(pid, t) => onCell(pid, cat.key, t)}
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
                  category={item}
                  players={players}
                  value={pid => raw[pid]?.[item.key] ?? ""}
                  onChange={(pid, t) => onCell(pid, item.key, t)}
                  disabled={disabled}
                />
              </Section>
            ),
          )}
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
}: Readonly<{
  label?: string;
  gridCols: string;
  children: React.ReactNode;
}>) {
  return (
    <div className="rounded-lg border border-black/15 dark:border-white/15">
      {label ? (
        <div className="border-b border-black/10 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-white/10 dark:text-zinc-400">
          <span className="sticky left-1 inline-block">{label}</span>
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

/**
 * Background for the identifying dot: solid for one colour, a diagonal
 * half-and-half split for two, an even conic split for more.
 */
function dotStyle(colors: string[]): React.CSSProperties {
  if (colors.length === 1) {
    return { background: colors[0] };
  }

  if (colors.length === 2) {
    return {
      background: `linear-gradient(135deg, ${colors[0]} 0 50%, ${colors[1]} 50% 100%)`,
    };
  }

  const step = 100 / colors.length;
  const stops = colors
    .map((c, i) => `${c} ${i * step}% ${(i + 1) * step}%`)
    .join(", ");

  return { background: `conic-gradient(${stops})` };
}

/** One scored line: its label then a cell per player (with a `/N` bonus badge). */
function Row({
  category,
  players,
  value,
  onChange,
  bonus,
  disabled,
}: Readonly<{
  category: CategoryDef;
  players: { id: PlayerId; name: string }[];
  value: (playerId: PlayerId) => string;
  onChange: (playerId: PlayerId, text: string) => void;
  bonus?: Record<string, number>;
  disabled: boolean;
}>) {
  const { label, colors } = category;
  const icon = categoryIconOf(category);

  return (
    <>
      <span
        title={label}
        className="sticky left-0 z-10 flex items-center gap-1.5 self-stretch border-black/10 border-r bg-white px-1 dark:border-white/10 dark:bg-zinc-900"
      >
        {colors && colors.length > 0 ? (
          <span
            aria-hidden
            className="size-3 shrink-0 rounded-full ring-1 ring-black/20 dark:ring-white/25"
            style={dotStyle(colors)}
          />
        ) : null}
        {/* A drawing stands in for the words, as on the printed pad; the ⓘ at
            the head of the column is where it is spelled out. */}
        {icon ? (
          <CategoryIcon id={icon} title={label} />
        ) : (
          <span className="min-w-0 truncate text-sm">{label}</span>
        )}
      </span>
      {players.map(pl => (
        <span key={pl.id} className="flex items-center justify-center">
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
