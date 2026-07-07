"use client";

/**
 * A labelled multi-select as a row of toggle chips. "Tous" clears the selection
 * (active when nothing is picked); each option toggles on/off. Selection is held
 * by the parent as a list of ids.
 */
export function ChipMultiSelect({
  label,
  options,
  selected,
  onToggle,
  onClear,
}: {
  label: string;
  options: { id: string; name: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  onClear: () => void;
}) {
  const chip =
    "rounded-full border px-3 py-1 text-sm transition [@media(hover:hover)]:hover:border-indigo-400";
  const on =
    "border-indigo-500 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300";
  const off = "border-black/10 dark:border-white/15";

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onClear}
          className={`${chip} ${selected.length === 0 ? on : off}`}
        >
          Tous
        </button>
        {options.map(opt => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onToggle(opt.id)}
            className={`${chip} ${selected.includes(opt.id) ? on : off}`}
          >
            {opt.name}
          </button>
        ))}
      </div>
    </div>
  );
}
