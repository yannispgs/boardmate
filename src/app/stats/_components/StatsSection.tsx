import type { ReactNode } from "react";

/** A titled block of the stats tab. */
export function StatsSection({
  title,
  children,
}: Readonly<{ title: ReactNode; children: ReactNode }>) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="flex items-center gap-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">
        {title}
      </h2>
      {children}
    </div>
  );
}
