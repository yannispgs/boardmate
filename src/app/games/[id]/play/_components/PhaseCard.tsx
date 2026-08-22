"use client";

/** Where one phase stands relative to the one being played. */
export type PhaseState = "done" | "current" | "todo";

const STYLE: Readonly<Record<PhaseState, string>> = {
  done: "border-transparent bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500",
  current: "border-blue-500 bg-blue-500 text-white",
  todo: "border-zinc-300 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400",
};

/**
 * One phase in the strip: its rank over its name. Named in full rather than
 * numbered alone — « Production des ressources » is what the table calls it, and
 * the whole point of the strip is that nobody has to translate a number back
 * into the rulebook. The rank rides above it because the rulebook *does* number
 * them, so « on est en phase 2 » and the box agree without anyone counting
 * pills.
 */
export function PhaseCard({
  rank,
  label,
  state,
}: Readonly<{
  /** Its place in the stage, counted from 1 as the rulebook counts it. */
  rank: number;
  label: string;
  state: PhaseState;
}>) {
  return (
    <li
      className={`rounded-xl border px-3 py-1 text-center text-xs font-semibold ${STYLE[state]}`}
    >
      <span className="block text-[10px] font-medium tracking-wide opacity-70">
        Phase {rank}
      </span>
      <span className="block">{label}</span>
    </li>
  );
}
