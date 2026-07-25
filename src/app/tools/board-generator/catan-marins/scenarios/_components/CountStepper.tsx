"use client";

/**
 * One counter of a zone's bag: a swatch, a label, and the −/+ pair the author
 * clicks. Everything the editor counts — tiles per terrain, tokens per value,
 * harbours per type — is one of these.
 */
export function CountStepper({
  label,
  color,
  value,
  onChange,
  max = 99,
}: {
  label: string;
  /** Colour chip in front of the label, when the thing counted has one. */
  color?: string;
  value: number;
  onChange: (value: number) => void;
  max?: number;
}) {
  const buttonClass =
    "h-6 w-6 rounded-md border border-black/10 text-sm leading-none transition hover:bg-black/5 disabled:opacity-30 dark:border-white/15 dark:hover:bg-white/5";

  return (
    <div className="flex items-center gap-2 text-sm">
      {color === undefined ? null : (
        <span
          aria-hidden
          className="h-3.5 w-3.5 shrink-0 rounded-sm border border-black/10"
          style={{ backgroundColor: color }}
        />
      )}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <button
        type="button"
        aria-label={`Retirer ${label}`}
        onClick={() => onChange(value - 1)}
        disabled={value <= 0}
        className={buttonClass}
      >
        −
      </button>
      <span
        className={`w-6 text-center tabular-nums ${
          value === 0 ? "text-zinc-400" : "font-semibold"
        }`}
      >
        {value}
      </span>
      <button
        type="button"
        aria-label={`Ajouter ${label}`}
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        className={buttonClass}
      >
        +
      </button>
    </div>
  );
}
