"use client";

import type { Player, PlayerId, ScoringSpec } from "@/lib/domain";
import {
  type CategoryRaw,
  CategoryScoreGrid,
} from "../../_components/CategoryScoreGrid";
import { PairScoreCircle } from "../../_components/PairScoreCircle";
import type { EntryMode, FinishedEntry } from "./finished-entry";

/** What the alternative to a plain total is called on this game's own sheet. */
function detailLabel(pairs: boolean): string {
  if (pairs) {
    return "Tas partagés";
  }

  return "Détail par catégorie";
}

/**
 * How the scores are asked for: the game's own sheet when the table kept it, a
 * plain total per player otherwise. Games that have a sheet get the choice, so
 * a night nobody wrote down can still be recorded from memory as totals.
 */
export function ScoreEntrySection({
  scoring,
  entry,
  players,
  entryMode,
  totals,
  catRaw,
  piles,
  disabled,
  onEntryMode,
  onTotal,
  onCell,
  onPile,
}: Readonly<{
  scoring: ScoringSpec;
  entry: FinishedEntry;
  players: Player[];
  entryMode: EntryMode;
  totals: Record<string, string>;
  catRaw: CategoryRaw;
  piles: Record<string, number>;
  disabled: boolean;
  onEntryMode: (mode: EntryMode) => void;
  onTotal: (id: PlayerId, text: string) => void;
  onCell: (id: PlayerId, key: string, text: string) => void;
  onPile: (key: string, value: number) => void;
}>) {
  return (
    <div className="flex flex-col gap-3">
      {entry.sheet !== null || entry.pairs ? (
        <div className="flex flex-wrap gap-2 text-sm">
          {(["total", "detail"] as const).map(mode => (
            <label
              key={mode}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-medium transition ${
                entryMode === mode
                  ? "border-indigo-500 bg-indigo-600 text-white"
                  : "border-black/15 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
              }`}
            >
              <input
                type="radio"
                name="entryMode"
                className="sr-only"
                checked={entryMode === mode}
                onChange={() => onEntryMode(mode)}
              />
              <span>
                {mode === "total" ? "Score total" : detailLabel(entry.pairs)}
              </span>
            </label>
          ))}
        </div>
      ) : null}

      <ScoreFields
        entry={entry}
        players={players}
        totals={totals}
        catRaw={catRaw}
        piles={piles}
        allowNegative={scoring.allowNegative ?? false}
        disabled={disabled}
        onTotal={onTotal}
        onCell={onCell}
        onPile={onPile}
      />
    </div>
  );
}

/** The fields themselves, for whichever of the three sheets is on screen. */
function ScoreFields({
  entry,
  players,
  totals,
  catRaw,
  piles,
  allowNegative,
  disabled,
  onTotal,
  onCell,
  onPile,
}: Readonly<{
  entry: FinishedEntry;
  players: Player[];
  totals: Record<string, string>;
  catRaw: CategoryRaw;
  piles: Record<string, number>;
  allowNegative: boolean;
  disabled: boolean;
  onTotal: (id: PlayerId, text: string) => void;
  onCell: (id: PlayerId, key: string, text: string) => void;
  onPile: (key: string, value: number) => void;
}>) {
  const named = players.map(p => ({ id: p.id, name: p.name }));

  if (entry.catMode && entry.sheet !== null) {
    return (
      <div className="flex flex-col gap-2">
        <CategoryScoreGrid
          players={named}
          sheet={entry.sheet}
          raw={catRaw}
          disabled={disabled}
          onCell={onCell}
        />
        {entry.scored ? (
          <ul className="flex flex-col gap-1 text-sm">
            {players.map(p => (
              <li key={p.id} className="flex justify-between">
                <span>{p.name}</span>
                <span className="font-medium tabular-nums">
                  {entry.scored?.[p.id]?.total ?? 0} pts
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Encore {entry.remainingCells} case
            {entry.remainingCells > 1 ? "s" : ""} à remplir.
          </p>
        )}
      </div>
    );
  }

  if (entry.pairMode) {
    return (
      <div className="flex flex-col gap-2">
        <PairScoreCircle
          seats={named}
          piles={piles}
          onPile={onPile}
          disabled={disabled}
        />
        {entry.remainingPiles > 0 ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Encore {entry.remainingPiles} tas à compter.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">Score final</span>
      {named.map(p => (
        <label
          key={p.id}
          className="flex items-center justify-between gap-2 text-sm"
        >
          <span>{p.name}</span>
          <input
            type="number"
            inputMode="numeric"
            min={allowNegative ? undefined : 0}
            value={totals[p.id] ?? ""}
            onChange={e => onTotal(p.id, e.target.value)}
            className="no-spinners w-20 rounded-lg border border-black/15 bg-white px-2 py-1 text-right tabular-nums outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900"
          />
        </label>
      ))}
    </div>
  );
}
