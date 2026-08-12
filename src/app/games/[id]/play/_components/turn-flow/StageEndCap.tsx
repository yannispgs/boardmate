import { MID } from "./geometry";

/**
 * What closes the ribbon at the end of a manche. The table has gone round for
 * the last time, and what comes next is the goal tile being scored, not another
 * player — so the ribbon says so instead of announcing a turn nobody will take.
 * It starts again, from the top, once those points are in.
 */
export function StageEndCap({
  label,
  left,
}: Readonly<{ label: string; left: number }>) {
  return (
    <div className="absolute top-0" style={{ left }}>
      <span
        className="-translate-y-1/2 absolute whitespace-nowrap font-semibold text-sm text-zinc-500 dark:text-zinc-400"
        style={{ top: MID }}
      >
        {label}
      </span>
    </div>
  );
}
