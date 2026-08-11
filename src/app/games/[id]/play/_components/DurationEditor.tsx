"use client";

import { useState } from "react";

/** Overrides the current turn's countdown, for the one turn that needs longer. */
export function DurationEditor({
  durationS,
  onChange,
  onPause,
}: Readonly<{
  durationS: number;
  onChange: (seconds: number) => void;
  onPause: () => void;
}>) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(durationS.toString());

  function start() {
    onPause(); // editing pauses the turn, as in board-nest
    setValue(durationS.toString());
    setOpen(true);
  }

  function apply() {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) {
      onChange(Math.round(n));
    }
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={start}
        className="text-sm text-zinc-500 underline-offset-2 hover:underline"
      >
        Durée du tour : {durationS}s — modifier
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={1}
        value={value}
        onChange={e => setValue(e.target.value)}
        aria-label="Durée du tour en secondes"
        className="w-24 rounded-lg border border-black/15 bg-white px-3 py-2 outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900"
      />
      <button
        type="button"
        onClick={apply}
        className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
      >
        OK
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15"
      >
        Annuler
      </button>
    </div>
  );
}
