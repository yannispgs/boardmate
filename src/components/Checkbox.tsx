"use client";

/**
 * A labelled checkbox — the app's one way of asking a yes/no question inline,
 * where a whole field would be too much furniture. The label is part of the hit
 * target as well as the text, which is what makes it usable with a thumb.
 *
 * It started life in the board generator's settings; the end-of-game recap
 * needed the same thing, so it moved up here rather than being typed twice.
 */
export function Checkbox({
  label,
  checked,
  onChange,
  className,
}: Readonly<{
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  /** Placement only — the box and its label read the same everywhere. */
  className?: string;
}>) {
  return (
    <label className={`flex items-center gap-2 text-sm ${className ?? ""}`}>
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
