"use client";

import { useState } from "react";

import {
  useWheelSpin,
  type WheelSegment,
  WheelSvg,
} from "@/components/WheelSvg";
import { usePlayers } from "@/lib/hooks/use-players";

/**
 * A standalone wheel of fortune: build a list of entries — the active players in
 * one tap, plus any free-text names for people or things not in the app — then
 * spin to pick one at random. Nothing is saved; it never touches games or stats.
 */
export function WheelTool() {
  const { players } = usePlayers();
  const [entries, setEntries] = useState<WheelSegment[]>([]);
  const [draft, setDraft] = useState("");
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

  function addDraft() {
    const label = draft.trim();

    if (label.length === 0) {
      return;
    }

    edit([...entries, { id: crypto.randomUUID(), label }]);
    setDraft("");
  }

  function addActivePlayers() {
    const present = new Set(entries.map(e => e.id));
    const toAdd = players
      .filter(p => p.isActive && !present.has(p.id))
      .map(p => ({ id: p.id, label: p.name }));

    if (toAdd.length > 0) {
      edit([...entries, ...toAdd]);
    }
  }

  function removeEntry(id: string) {
    edit(entries.filter(e => e.id !== id));
  }

  const canSpin = entries.length >= 2 && !spinning;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex w-full max-w-md flex-col gap-3 rounded-xl border border-black/10 p-4 dark:border-white/10">
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") {
                e.preventDefault();
                addDraft();
              }
            }}
            placeholder="Ajouter une entrée…"
            maxLength={40}
            className="flex-1 rounded-lg border border-black/15 bg-white px-3 py-2 outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900"
          />
          <button
            type="button"
            onClick={addDraft}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500"
          >
            Ajouter
          </button>
        </div>

        <button
          type="button"
          onClick={addActivePlayers}
          className="self-start rounded-lg border border-black/15 px-3 py-1.5 text-sm font-medium transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
        >
          + Ajouter les joueurs actifs
        </button>

        {entries.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {entries.map(e => (
              <li
                key={e.id}
                className="flex items-center gap-1.5 rounded-full bg-black/5 py-1 pr-1 pl-3 text-sm dark:bg-white/10"
              >
                {e.label}
                <button
                  type="button"
                  onClick={() => removeEntry(e.id)}
                  aria-label={`Retirer ${e.label}`}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-zinc-500 transition hover:bg-black/10 hover:text-zinc-800 dark:hover:bg-white/10 dark:hover:text-zinc-100"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Ajoute au moins deux entrées pour lancer la roue.
          </p>
        )}
      </div>

      {entries.length >= 2 ? (
        <WheelSvg
          segments={entries}
          rotation={rotation}
          spinning={spinning}
          onSettled={handleSettled}
        />
      ) : null}

      {winner ? (
        <p className="text-center text-lg" aria-live="polite">
          🎉 <span className="font-semibold">{winner.label}</span> !
        </p>
      ) : (
        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
          {spinning ? "La roue tourne…" : "Lance la roue pour tirer au sort."}
        </p>
      )}

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
