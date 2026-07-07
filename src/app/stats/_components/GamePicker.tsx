"use client";

/** Single-select row of game chips — exactly one game is active at a time. */
export function GamePicker({
  options,
  selected,
  onSelect,
}: {
  options: { id: string; name: string }[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
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
  );
}
