// Shared Tailwind class strings reused across cards/lists, so the styling of
// an icon button or a section heading lives in one place.

export const iconButtonClass =
  "rounded-md border border-black/10 p-1.5 transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5";

export const dangerIconButtonClass =
  "rounded-md border border-black/10 p-1.5 text-red-600 transition hover:bg-red-50 dark:border-white/15 dark:text-red-400 dark:hover:bg-red-950/40";

export const sectionHeadingClass =
  "text-xs font-semibold uppercase tracking-wide text-zinc-400";

/** A text/number/select field, bordered to match the buttons beside it. */
export const fieldClass =
  "rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15";

/** A pill-shaped choice, filled in when it is the one in force. */
export const chipClass = (active: boolean) =>
  `rounded-full border px-3 py-1 text-sm transition ${
    active
      ? "border-indigo-500 bg-indigo-500/10 font-medium text-indigo-700 dark:text-indigo-300"
      : "border-black/10 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
  }`;
