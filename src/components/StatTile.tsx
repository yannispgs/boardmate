import type { ReactNode } from "react";

import type { DeltaDirection, StatDelta } from "@/lib/game/stat-delta";

/** How a gap to the reference is drawn: arrow + tint, above / below / level. */
const DELTA: Record<DeltaDirection, { arrow: string; className: string }> = {
  above: { arrow: "▲", className: "text-indigo-600 dark:text-indigo-400" },
  below: { arrow: "▼", className: "text-teal-600 dark:text-teal-400" },
  level: { arrow: "", className: "text-zinc-500 dark:text-zinc-400" },
};

/**
 * A labelled value in a stats summary grid: a large value with a small caption
 * beneath, optionally tinted to stand out (e.g. a headline figure). Shared by
 * the end-of-game panel, the live panel, and the global stats page. Pass `info`
 * (an {@link InfoTip}) to append a tappable explanation next to the label, and
 * `delta` to read the value against a reference (`deltaLabel` names it).
 */
export function StatTile({
  label,
  value,
  accent = false,
  info,
  delta,
  deltaLabel = "moy.",
}: Readonly<{
  label: string;
  value: string;
  accent?: boolean;
  info?: ReactNode;
  /** The gap to the reference, or null when there is nothing to compare with. */
  delta?: StatDelta | null;
  /** What the gap is measured against, spelled out under the value. */
  deltaLabel?: string;
}>) {
  return (
    <div
      className={`flex flex-col gap-0.5 rounded-xl border p-3 ${
        accent
          ? "border-indigo-500/30 bg-indigo-500/5"
          : "border-black/10 dark:border-white/10"
      }`}
    >
      <span
        className={`text-lg font-semibold tabular-nums ${
          accent ? "text-indigo-600 dark:text-indigo-400" : ""
        }`}
      >
        {value}
      </span>
      <span className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
        {label}
        {info}
      </span>
      {delta ? (
        <span
          className={`text-xs tabular-nums ${DELTA[delta.direction].className}`}
        >
          {DELTA[delta.direction].arrow} {delta.text} / {deltaLabel}
        </span>
      ) : null}
    </div>
  );
}
