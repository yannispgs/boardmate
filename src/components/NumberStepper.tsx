"use client";

import { useState } from "react";

import { digitsOnly, numberOf } from "@/lib/ui/number-input";

/**
 * A small whole number entered on a phone: a target either side to nudge it,
 * and the number itself editable for when the value wanted is nowhere near the
 * one shown.
 *
 * Tapping the number selects all of it, so the next digit typed **replaces**
 * what was there instead of joining it: such a number is read off the table
 * afresh, never added to what the box already says.
 */
export function NumberStepper({
  label,
  value,
  min = 0,
  max = null,
  disabled = false,
  onChange,
}: Readonly<{
  /** What is being counted — names the box and its two arrows. */
  label: string;
  value: number;
  min?: number;
  /** The highest the arrows go, `null` when the rules give no ceiling. */
  max?: number | null;
  disabled?: boolean;
  onChange: (value: number) => void;
}>) {
  // What is being typed, while it is being typed: a box emptied under the caret
  // has to stay empty, though it is already worth nothing to the caller.
  const [draft, setDraft] = useState<string | null>(null);

  const arrowClass =
    "h-9 w-9 shrink-0 rounded-full border border-black/10 text-lg leading-none transition hover:bg-black/5 disabled:opacity-30 dark:border-white/15 dark:hover:bg-white/5";
  // A round box holds two digits; a game counting in hundreds (Papayoo's 250 a
  // manche) needs three, and « 250 » in a 36-pixel circle is unreadable.
  const boxWidth = max !== null && max >= 100 ? "w-14" : "w-9";

  function nudge(delta: number) {
    setDraft(null);
    onChange(value + delta);
  }

  function typed(text: string) {
    const digits = digitsOnly(text);

    setDraft(digits);
    onChange(numberOf(digits));
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={`${label} : un de moins`}
        onClick={() => nudge(-1)}
        disabled={disabled || value <= min}
        className={arrowClass}
      >
        −
      </button>

      {/* Not `type="number"`: its spinners would sit next to the two arrows
          that replace them, and selecting its content on focus is patchy. */}
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label={label}
        value={draft ?? String(value)}
        disabled={disabled}
        onFocus={event => event.currentTarget.select()}
        onBlur={() => setDraft(null)}
        onChange={event => typed(event.target.value)}
        className={`h-9 ${boxWidth} shrink-0 rounded-full border border-black/10 bg-transparent text-center font-semibold tabular-nums dark:border-white/15`}
      />

      <button
        type="button"
        aria-label={`${label} : un de plus`}
        onClick={() => nudge(1)}
        disabled={disabled || (max !== null && value >= max)}
        className={arrowClass}
      >
        +
      </button>
    </div>
  );
}
