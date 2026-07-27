"use client";

/** A labelled checkbox, to keep the generator's settings readable. */
export function Check({
  label,
  checked,
  onChange,
}: Readonly<{
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}>) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="h-4 w-4 shrink-0 accent-indigo-600"
      />
      {label}
    </label>
  );
}
