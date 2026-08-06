"use client";

import { useState } from "react";

import {
  useWheelSpin,
  type WheelSegment,
  WheelSvg,
} from "@/components/WheelSvg";
import { usePlayers } from "@/lib/hooks/use-players";
import { PlayerSearch } from "./PlayerSearch";

/**
 * A standalone wheel of fortune: search the active players to toggle them on the
 * wheel, or create off-app entries from any typed name, then spin to pick one at
 * random. Nothing is saved; it never touches games or stats.
 */
export function WheelTool() {
  const { players } = usePlayers();
  const [entries, setEntries] = useState<WheelSegment[]>([]);
  const { rotation, spinning, settledIndex, spin, handleSettled, reset } =
    useWheelSpin(entries.length);

  const winner =
    settledIndex !== null && settledIndex < entries.length
      ? entries[settledIndex]
      : null;

  function edit(next: WheelSegment[]) {
    reset();
    setEntries(next);
  }

  function removeEntry(id: string) {
    edit(entries.filter(e => e.id !== id));
  }

  function createEntry(label: string) {
    edit([...entries, { id: crypto.randomUUID(), label }]);
  }

  /** Clicking a player toggles it on/off the wheel (keeps the search open). */
  function togglePlayer(id: string, name: string) {
    if (entries.some(e => e.id === id)) {
      removeEntry(id);
    } else {
      edit([...entries, { id, label: name }]);
    }
  }

  const canSpin = entries.length >= 2 && !spinning;
  const addedIds = new Set(entries.map(e => e.id));

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex w-full max-w-md flex-col gap-3 rounded-xl border border-black/10 p-4 dark:border-white/10">
        <PlayerSearch
          players={players}
          addedIds={addedIds}
          onCreate={createEntry}
          onToggle={togglePlayer}
        />

        <EntryChips entries={entries} onRemove={removeEntry} />
      </div>

      {entries.length >= 2 ? (
        <WheelSvg
          segments={entries}
          rotation={rotation}
          spinning={spinning}
          onSettled={handleSettled}
        />
      ) : null}

      <Result winner={winner} spinning={spinning} />

      <button
        type="button"
        onClick={spin}
        disabled={!canSpin}
        className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
      >
        {winner ? "Relancer" : "Tourner la roue"}
      </button>
    </div>
  );
}

/** What is on the wheel right now, each removable. */
function EntryChips({
  entries,
  onRemove,
}: Readonly<{
  entries: WheelSegment[];
  onRemove: (id: string) => void;
}>) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Ajoute au moins deux entrées pour lancer la roue.
      </p>
    );
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {entries.map(e => (
        <li
          key={e.id}
          className="flex items-center gap-1.5 rounded-full bg-black/5 py-1 pr-1 pl-3 text-sm dark:bg-white/10"
        >
          {e.label}
          <button
            type="button"
            onClick={() => onRemove(e.id)}
            aria-label={`Retirer ${e.label}`}
            className="flex h-5 w-5 items-center justify-center rounded-full text-zinc-500 transition hover:bg-black/10 hover:text-zinc-800 dark:hover:bg-white/10 dark:hover:text-zinc-100"
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  );
}

/** The drawn entry, or what the wheel is doing while there is none. */
function Result({
  winner,
  spinning,
}: Readonly<{ winner: WheelSegment | null; spinning: boolean }>) {
  if (winner) {
    return (
      <p className="text-center text-lg" aria-live="polite">
        🎉 <span className="font-semibold">{winner.label}</span> !
      </p>
    );
  }

  return (
    <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
      {spinning ? "La roue tourne…" : "Lance la roue pour tirer au sort."}
    </p>
  );
}
