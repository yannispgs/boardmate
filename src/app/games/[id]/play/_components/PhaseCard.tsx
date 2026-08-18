"use client";

/** Where one phase stands relative to the one being played. */
export type PhaseState = "done" | "current" | "todo";

const STYLE: Readonly<Record<PhaseState, string>> = {
  done: "border-transparent bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500",
  current: "border-blue-500 bg-blue-500 text-white",
  todo: "border-zinc-300 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400",
};

/**
 * One phase in the strip. Named in full rather than numbered: « Production des
 * ressources » is what the table calls it, and the whole point of the strip is
 * that nobody has to translate a number back into the rulebook.
 */
export function PhaseCard({
  label,
  state,
}: Readonly<{ label: string; state: PhaseState }>) {
  return (
    <li
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${STYLE[state]}`}
    >
      {label}
    </li>
  );
}
