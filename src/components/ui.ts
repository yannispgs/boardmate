// Shared Tailwind class strings reused across cards/lists, so the styling of
// an icon button or a section heading lives in one place.

// `shrink-0`: an icon button is its icon. Beside a text column that is allowed
// to shrink, a flex row would otherwise squeeze the buttons instead — and on a
// narrow screen the squeezing lands on the text, which loses its own name.
export const iconButtonClass =
  "shrink-0 rounded-md border border-black/10 p-1.5 transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5";

export const dangerIconButtonClass =
  "shrink-0 rounded-md border border-black/10 p-1.5 text-red-600 transition hover:bg-red-50 dark:border-white/15 dark:text-red-400 dark:hover:bg-red-950/40";

export const sectionHeadingClass =
  "text-xs font-semibold uppercase tracking-wide text-zinc-400";

/** A text/number/select field, bordered to match the buttons beside it. */
export const fieldClass =
  "rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15";

/**
 * A modal card: a column that never outgrows the **visible** viewport, so its
 * header and its footer are always reachable and its body scrolls between them.
 * Add the width it wants (`max-w-md`…).
 *
 * `dvh` and not `lvh`: the large viewport is the phone's screen **with the
 * browser bars hidden**, so a card measured on it hangs under the toolbar and
 * takes its own footer with it.
 */
export const modalCardClass =
  "flex max-h-[90dvh] w-full flex-col rounded-xl border border-black/10 bg-white shadow-xl dark:border-white/10 dark:bg-zinc-900";

/** A pill-shaped choice, filled in when it is the one in force. */
export const chipClass = (active: boolean) =>
  `rounded-full border px-3 py-1 text-sm transition ${
    active
      ? "border-indigo-500 bg-indigo-500/10 font-medium text-indigo-700 dark:text-indigo-300"
      : "border-black/10 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
  }`;
