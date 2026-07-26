"use client";

/**
 * Single-select row of chips — exactly one is active at a time. Used wherever a
 * handful of mutually-exclusive choices fit on one line: which game the
 * statistics are about, which status the games list is narrowed to.
 */
export function ChipPicker<Id extends string>({
  label,
  options,
  selected,
  onSelect,
}: {
  /** Shown above the row; omit it where the surrounding screen says enough. */
  label?: string;
  options: { id: Id; name: string }[];
  selected: Id;
  onSelect: (id: Id) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {label === undefined ? null : (
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {label}
        </span>
      )}

      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelect(opt.id)}
            className={`rounded-full border px-3 py-1 text-sm transition [@media(hover:hover)]:hover:border-indigo-400 ${
              opt.id === selected
                ? "border-indigo-500 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                : "border-black/10 dark:border-white/15"
            }`}
          >
            {opt.name}
          </button>
        ))}
      </div>
    </div>
  );
}
