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
  layout = "row",
}: Readonly<{
  label: string;
  /** Colour chip in front of the label, when the thing counted has one. */
  color?: string;
  value: number;
  onChange: (value: number) => void;
  max?: number;
  /**
   * "row" spells the label out beside the counter — right for a named thing
   * ("Port bois 2:1"). "stack" puts a short label over a vertical counter, so
   * a dozen of them fit side by side instead of eating a dozen lines.
   */
  layout?: "row" | "stack";
}>) {
  const buttonClass =
    "h-6 w-6 rounded-md border border-black/10 text-sm leading-none transition hover:bg-black/5 disabled:opacity-30 dark:border-white/15 dark:hover:bg-white/5";

  const minus = (
    <button
      type="button"
      aria-label={`Retirer ${label}`}
      onClick={() => onChange(value - 1)}
      disabled={value <= 0}
      className={buttonClass}
    >
      −
    </button>
  );

  const plus = (
    <button
      type="button"
      aria-label={`Ajouter ${label}`}
      onClick={() => onChange(value + 1)}
      disabled={value >= max}
      className={buttonClass}
    >
      +
    </button>
  );

  const count = (
    <span
      className={`w-6 text-center tabular-nums ${
        value === 0 ? "text-zinc-400" : "font-semibold"
      }`}
    >
      {value}
    </span>
  );

  if (layout === "stack") {
    return (
      <div className="flex flex-col items-center gap-1 text-sm">
        <span className="font-semibold tabular-nums">{label}</span>
        {plus}
        {count}
        {minus}
      </div>
    );
  }

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
      {minus}
      {count}
      {plus}
    </div>
  );
}
