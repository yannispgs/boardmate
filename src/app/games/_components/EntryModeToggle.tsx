/**
 * The choice between the ways a night can be written down — a plain total, or
 * the detail it was really scored on — as a row of pills.
 */
export function EntryModeToggle<Mode extends string>({
  name,
  value,
  options,
  onChange,
}: Readonly<{
  /** Groups the radios, one name per toggle on the page. */
  name: string;
  value: Mode;
  options: ReadonlyArray<{ value: Mode; label: string }>;
  onChange: (mode: Mode) => void;
}>) {
  return (
    <div className="flex flex-wrap gap-2 text-sm">
      {options.map(option => (
        <label
          key={option.value}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-medium transition ${
            value === option.value
              ? "border-indigo-500 bg-indigo-600 text-white"
              : "border-black/15 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
          }`}
        >
          <input
            type="radio"
            name={name}
            className="sr-only"
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );
}
