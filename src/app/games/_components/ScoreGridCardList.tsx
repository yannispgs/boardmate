"use client";

import { useState } from "react";

import type { PlayerId, ScoreGrid, ScoreSheetItem } from "@/lib/domain";
import { gridLines, seedCells } from "@/lib/game/score-grid";
import { sheetCategories } from "@/lib/game/scoring";

import type { CategoryRaw } from "./CategoryScoreGrid";
import { ScoreGridCard } from "./ScoreGridCard";

/**
 * The sheet counted card by card, a card per player laid out like their cards
 * on the table (Symbiose's mare). The cells are this list's own; what it hands
 * back is each line's sum, as if it had been typed on the sheet — so the forms
 * around it, and what they record, stay those of a sheet counted line by line.
 */
export function ScoreGridCardList({
  players,
  sheet,
  grid,
  raw,
  onCell,
  disabled,
}: Readonly<{
  players: { id: PlayerId; name: string }[];
  sheet: ScoreSheetItem[];
  grid: ScoreGrid;
  /** The lines as they stand — what a reopened sheet starts from. */
  raw: CategoryRaw;
  onCell: (playerId: PlayerId, key: string, text: string) => void;
  disabled: boolean;
}>) {
  const [cells, setCells] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(
      players.map(p => [p.id, seedCells(grid, raw[p.id] ?? {})]),
    ),
  );
  const labels = new Map(sheetCategories(sheet).map(c => [c.key, c.label]));

  function setCell(playerId: PlayerId, index: number, text: string) {
    const next = [...(cells[playerId] ?? seedCells(grid, {}))];

    next[index] = text;
    setCells(current => ({ ...current, [playerId]: next }));

    // Only the lines that moved: a cell changes one zone, and a parent that
    // hears of every line would mark the others as touched for nothing.
    for (const [key, sum] of Object.entries(gridLines(grid, next))) {
      if (sum !== (raw[playerId]?.[key] ?? "")) {
        onCell(playerId, key, sum);
      }
    }
  }

  return (
    <ul data-testid="score-grid" className="flex flex-col gap-2">
      {players.map(p => (
        <ScoreGridCard
          key={p.id}
          player={p}
          grid={grid}
          labelOf={key => labels.get(key) ?? key}
          cells={cells[p.id] ?? seedCells(grid, {})}
          disabled={disabled}
          onCell={(index, text) => setCell(p.id, index, text)}
        />
      ))}
    </ul>
  );
}
