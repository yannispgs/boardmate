"use client";

/**
 * One counter of a zone's bag: a swatch, a label, and the −/+ pair the author
 * clicks. Everything the editor counts — tiles per terrain, tokens per value,
 * harbours per type — is one of these.
 */
export function CountStepper({
  label,
  swatch,
  value,
  onChange,
  max = 99,
  layout = "row",
}: Readonly<{
  label: string;
  /**
   * Chip in front of the label, when the thing counted has one — any CSS
   * background, so a gold river can be the gradient it is drawn as elsewhere.
   */
  swatch?: string;
  value: number;
  onChange: (value: number) => void;
  max?: number;
  /**
   * "row" spells the label out beside the counter — right for a named thing
   * ("Forêt"). "stack" puts a short label over a vertical counter, so a dozen
   * of them fit side by side instead of eating a dozen lines.
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
      <div className="flex flex-col items-center gap-1 text-xs">
        {/* Two lines' worth of room whatever the label needs: a name that wraps
            ("minerai 2:1") then keeps its buttons level with its neighbours'. */}
        <span className="flex h-7 items-center text-center font-semibold leading-tight tabular-nums">
          {label}
        </span>
        {plus}
        {count}
        {minus}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      {swatch === undefined ? null : (
        <span
          aria-hidden
          className="h-3.5 w-3.5 shrink-0 rounded-sm border border-black/10"
          style={{ background: swatch }}
        />
      )}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {minus}
      {count}
      {plus}
    </div>
  );
}
