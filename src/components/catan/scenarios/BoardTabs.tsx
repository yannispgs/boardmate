"use client";

import { chipClass, sectionHeadingClass } from "@/components/ui";
import { useConfirm } from "@/components/use-confirm";
import {
  addBoard,
  duplicateBoard,
  removeBoard,
  setBoardPlayers,
} from "@/lib/catan/scenario-draft";
import type { ScenarioSpec } from "@/lib/catan/scenario-spec";

/** The player counts a Marins map is drawn for. */
export const PLAYER_COUNTS = [3, 4, 5, 6];

/**
 * Which map is being painted, and who it is played by: one board per group of
 * player counts, each count served by a single board. A count already taken
 * elsewhere can only be moved by dropping it there first — or by duplicating
 * this board onto it, which is how two player counts end up on near-identical
 * plans without painting either twice.
 */
export function BoardTabs({
  spec,
  board,
  labels,
  onChange,
  onPick,
}: Readonly<{
  spec: ScenarioSpec;
  board: number;
  /** How each board is named, so the tabs read like the boards they open. */
  labels: string[];
  onChange: (spec: ScenarioSpec) => void;
  onPick: (index: number) => void;
}>) {
  const { requestConfirm, confirmDialog } = useConfirm();
  const current = spec.boards[board] ?? spec.boards[0];
  const taken = new Set(spec.boards.flatMap(b => b.players));
  const free = PLAYER_COUNTS.filter(count => !taken.has(count));

  function togglePlayers(count: number) {
    const players = current.players.includes(count)
      ? current.players.filter(p => p !== count)
      : [...current.players, count].sort((a, b) => a - b);

    onChange(setBoardPlayers(spec, board, players));
  }

  function dropBoard() {
    requestConfirm({
      message: `Supprimer le plateau « ${labels[board]} » ? Son plan est perdu.`,
      confirmLabel: "Supprimer",
      onConfirm: () => {
        onChange(removeBoard(spec, board));
        onPick(0);
      },
    });
  }

  return (
    <section className="flex flex-col gap-2">
      <h3 className={sectionHeadingClass}>Plateaux</h3>
      <div className="flex flex-wrap gap-2">
        {labels.map((label, index) => (
          <button
            // biome-ignore lint/suspicious/noArrayIndexKey: a board is identified by its index, which is how every draft operation names it
            key={index} // NOSONAR: same reason
            type="button"
            onClick={() => onPick(index)}
            className={chipClass(index === board)}
          >
            {label}
          </button>
        ))}
        {free.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              onChange(addBoard(spec, [free[0]]));
              onPick(spec.boards.length);
            }}
            className={chipClass(false)}
          >
            + Plateau
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-zinc-500 dark:text-zinc-400">Utilisé à</span>
        {PLAYER_COUNTS.map(count => (
          <button
            key={count}
            type="button"
            onClick={() => togglePlayers(count)}
            disabled={taken.has(count) && !current.players.includes(count)}
            className={`${chipClass(current.players.includes(count))} disabled:opacity-30`}
          >
            {count}
          </button>
        ))}
        {free.map(count => (
          <button
            key={`copy-${count}`}
            type="button"
            onClick={() => {
              onChange(duplicateBoard(spec, board, [count]));
              onPick(spec.boards.length);
            }}
            className={chipClass(false)}
          >
            Dupliquer vers {count} joueurs
          </button>
        ))}
        {spec.boards.length > 1 ? (
          <button
            type="button"
            onClick={dropBoard}
            className="rounded-full border border-black/10 px-3 py-1 text-sm text-red-600 transition hover:bg-red-50 dark:border-white/15 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            Supprimer ce plateau
          </button>
        ) : null}
      </div>

      {confirmDialog}
    </section>
  );
}
