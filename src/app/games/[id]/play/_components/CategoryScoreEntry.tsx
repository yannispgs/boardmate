"use client";

import { useState } from "react";

import type { PlayerId, ScoreSheetItem } from "@/lib/domain";
import { isSubsection, sheetCategories } from "@/lib/game/scoring";

const inputClass =
  "w-16 rounded-lg border border-black/15 bg-white px-2 py-1 text-right tabular-nums outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900";

/**
 * End-of-game category scoresheet, filled one player at a time (mobile-friendly
 * vs a wide grid). The sheet's subsections and standalone lines come from the
 * boardgame's scoring. No total is shown during entry — the suspense is kept
 * until "Total final" computes everything.
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
  const [current, setCurrent] = useState<PlayerId>(players[0].id);
  const [raw, setRaw] = useState<Record<string, Record<string, string>>>({});

  const categories = sheetCategories(sheet);

  function setCell(playerId: PlayerId, key: string, text: string) {
    setRaw(r => ({
      ...r,
      [playerId]: { ...(r[playerId] ?? {}), [key]: text },
    }));
  }

  function filledCount(playerId: PlayerId): number {
    return categories.filter(c => (raw[playerId]?.[c.key] ?? "") !== "").length;
  }

  function submit() {
    const values: Record<string, Record<string, number>> = {};
    for (const p of players) {
      const per: Record<string, number> = {};
      for (const cat of categories) {
        const text = raw[p.id]?.[cat.key] ?? "";
        const n = Number.parseInt(text, 10);
        if (text !== "" && Number.isFinite(n)) {
          per[cat.key] = n;
        }
      }
      values[p.id] = per;
    }
    onSubmit(values);
  }

  const currentName = players.find(p => p.id === current)?.name ?? "";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Comptage des points"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="flex max-h-[90lvh] w-full max-w-sm flex-col rounded-xl border border-black/10 bg-white shadow-xl dark:border-white/10 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-black/10 p-4 dark:border-white/10">
          <h2 className="text-base font-semibold">Comptage des points</h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Fermer"
            className="rounded-lg border border-black/10 px-3 py-1 text-sm transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
          >
            Fermer
          </button>
        </div>

        {/* Whose sheet you're filling; the count nudges you to complete each. */}
        <div className="flex flex-wrap gap-1.5 border-b border-black/10 p-3 dark:border-white/10">
          {players.map(p => {
            const active = p.id === current;

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setCurrent(p.id)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  active
                    ? "border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                    : "border-black/10 text-zinc-500 dark:border-white/10"
                }`}
              >
                {p.name} ({filledCount(p.id)}/{categories.length})
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto p-4">
          {sheet.map(item =>
            isSubsection(item) ? (
              <fieldset key={item.label} className="flex flex-col gap-2">
                <legend className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                  {item.label}
                </legend>
                {item.categories.map(cat => (
                  <CategoryRow
                    key={cat.key}
                    label={cat.label}
                    playerName={currentName}
                    value={raw[current]?.[cat.key] ?? ""}
                    onChange={t => setCell(current, cat.key, t)}
                    disabled={disabled}
                  />
                ))}
              </fieldset>
            ) : (
              <CategoryRow
                key={item.key}
                label={item.label}
                playerName={currentName}
                value={raw[current]?.[item.key] ?? ""}
                onChange={t => setCell(current, item.key, t)}
                disabled={disabled}
              />
            ),
          )}
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

function CategoryRow({
  label,
  playerName,
  value,
  onChange,
  disabled,
}: {
  label: string;
  playerName: string;
  value: string;
  onChange: (text: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        aria-label={`${label} — ${playerName}`}
        className={inputClass}
      />
    </div>
  );
}
