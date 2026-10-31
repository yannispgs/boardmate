"use client";

import { useState } from "react";

import type { Player, PlayerId } from "@/lib/domain";

import { ManchePointsDialog } from "../../_components/ManchePointsDialog";
import { MancheGridRow } from "./MancheGridRow";

/** One player's cell in one manche: the points, null until set, and the box. */
export interface MancheCell {
  points: number | null;
  checked: boolean;
}

/**
 * The manches of a night typed in afterwards, as one compact grid: a row per
 * manche, a column per player, each cell their points and a box to tick —
 * the phase laid down on Phase 10, the safety token on Luz. What the box says
 * and what the wheel offers are the game's business, asked of the caller.
 */
export function MancheGrid({
  testId,
  stageLabel,
  manches,
  keys,
  players,
  tagOf,
  checkNameOf,
  valuesOf,
  disabled,
  onPoints,
  onCheck,
  onRemove,
}: Readonly<{
  testId: string;
  /** What a manche is called (« Manche », « Donne »). */
  stageLabel: string;
  manches: ReadonlyArray<Readonly<Record<string, MancheCell>>>;
  /** A stable identity per manche, for the rows — removing one shifts the rest. */
  keys: readonly number[];
  players: Player[];
  /** The box's short tag in a cell (« P3 », « S »). */
  tagOf: (index: number, playerId: PlayerId) => string;
  /** What ticking a cell's box says (« P3 réalisée », « Jeton Sécurité »). */
  checkNameOf: (index: number, playerId: PlayerId) => string;
  /** What a cell's wheel offers, given whether its box is ticked. */
  valuesOf: (index: number, checked: boolean) => number[];
  disabled: boolean;
  onPoints: (index: number, playerId: PlayerId, points: number) => void;
  onCheck: (index: number, playerId: PlayerId, checked: boolean) => void;
  onRemove: (index: number) => void;
}>) {
  // The cell whose points are open in the dialog, if any.
  const [editing, setEditing] = useState<{
    index: number;
    playerId: PlayerId;
  } | null>(null);

  if (manches.length === 0) {
    return null;
  }

  const unit = stageLabel.toLowerCase();
  const open =
    editing === null ? null : manches[editing.index]?.[editing.playerId];

  return (
    <div className="overflow-x-auto">
      <table data-testid={testId} className="w-full">
        <thead>
          <tr className="text-xs text-zinc-500 dark:text-zinc-400">
            <th scope="col" className="pr-2 text-left font-medium">
              {stageLabel}
            </th>
            {players.map(p => (
              <th
                key={p.id}
                scope="col"
                className="max-w-16 truncate px-0.5 text-center font-medium"
              >
                {p.name}
              </th>
            ))}
            <th scope="col">
              <span className="sr-only">Retirer</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {manches.map((manche, index) => (
            <MancheGridRow
              key={keys[index]}
              index={index}
              unit={unit}
              manche={manche}
              players={players}
              tagOf={id => tagOf(index, id)}
              checkNameOf={id => checkNameOf(index, id)}
              disabled={disabled}
              onCheck={(id, checked) => onCheck(index, id, checked)}
              onEditPoints={playerId => setEditing({ index, playerId })}
              onRemove={() => onRemove(index)}
            />
          ))}
        </tbody>
      </table>

      {editing === null ? null : (
        <ManchePointsDialog
          title={`${
            players.find(p => p.id === editing.playerId)?.name ?? ""
          } — ${unit} ${editing.index + 1}`}
          values={valuesOf(editing.index, open?.checked === true)}
          initial={open?.points ?? null}
          onConfirm={points => {
            onPoints(editing.index, editing.playerId, points);
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}
