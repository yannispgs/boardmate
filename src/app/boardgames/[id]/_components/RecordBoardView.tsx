"use client";

import { useMemo, useState } from "react";

import { InfoTip } from "@/components/InfoTip";
import { ListState } from "@/components/ListState";
import { OptionPicker } from "@/components/OptionPicker";
import type { Boardgame } from "@/lib/domain";
import type { BoardRow, RecordEntry } from "@/lib/game/record-board";
import { recordBoard } from "@/lib/game/record-board";
import { useGameStats } from "@/lib/hooks/use-game-stats";
import { RecordDetailDialog } from "./RecordDetailDialog";
import { RecordRowList } from "./RecordRowList";

/** The cell whose per-player detail is open, with what it takes to name it. */
interface OpenCell {
  row: BoardRow;
  entry: RecordEntry;
  tabLabel: string;
}

/** What the page says of a game that keeps no record at all. */
function nothingTracked(name: string): string {
  return `${name} ne tient aucun record : ni ses scores ni sa durée ne se comparent d'une partie à l'autre.`;
}

/**
 * The records of one game: a tab per set of extensions, a line per table size,
 * and in each the marks standing — or « non attribué » where nobody has played
 * yet, which is the point of enumerating the grid rather than listing what has
 * been achieved.
 */
export function RecordBoardView({
  boardgame,
  extensions,
}: Readonly<{
  boardgame: Boardgame;
  /** The extensions the game declares, in their own order. */
  extensions: string[];
}>) {
  const { records, loading, error } = useGameStats();
  const [tabKey, setTabKey] = useState("");
  const [open, setOpen] = useState<OpenCell | null>(null);

  const board = useMemo(
    () => recordBoard({ boardgame, extensions, records }),
    [boardgame, extensions, records],
  );

  const tab = board.tabs.find(t => t.key === tabKey) ?? board.tabs[0];

  if (error !== null) {
    return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  }

  if (board.metrics.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {nothingTracked(boardgame.name)}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {board.tabs.length > 1 ? (
        <OptionPicker
          variant="chips"
          label="Extensions"
          options={board.tabs.map(t => ({ value: t.key, label: t.label }))}
          value={tab.key}
          onChange={setTabKey}
        />
      ) : null}

      <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
        Touche une marque pour voir où chaque joueur en est
        <InfoTip label="Comment lire les records">
          <p>
            Chaque ligne est une <strong>configuration</strong> : les extensions
            en jeu, et la taille de table quand le jeu se lit à taille égale.
            Deux parties ne se comparent que dans la même case.
          </p>
          <p>
            <strong>« Non attribué »</strong> veut dire que personne n&apos;y a
            encore joué — c&apos;est ce qu&apos;il reste à prendre, pas une
            donnée manquante.
          </p>
        </InfoTip>
      </div>

      <ListState
        loading={loading}
        empty={tab.rows.length === 0}
        emptyLabel="Aucune configuration à afficher pour ce jeu."
      >
        <RecordRowList
          rows={tab.rows}
          onOpen={(row, entry) => setOpen({ row, entry, tabLabel: tab.label })}
        />
      </ListState>

      {open === null ? null : (
        <RecordDetailDialog
          row={open.row}
          entry={open.entry}
          tabLabel={open.tabLabel}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}
