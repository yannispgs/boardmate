"use client";

/** A count against the count it has to match, red until the two agree. */
export function Tally({
  label,
  have,
  need,
}: Readonly<{
  label: string;
  have: number;
  need: number;
}>) {
  return (
    <span
      className={`text-xs tabular-nums ${
        have === need
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-red-600 dark:text-red-400"
      }`}
    >
      {label} {have} / {need}
    </span>
  );
}
