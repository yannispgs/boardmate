import Link from "next/link";
import type { ReactNode } from "react";

/** A block of the home page under its small capitalised heading. */
export function HomeSection({
  title,
  seeAll,
  className = "",
  children,
}: Readonly<{
  title: string;
  /** Where « Tout voir » goes, when the block shows only part of a list. */
  seeAll?: string;
  className?: string;
  children: ReactNode;
}>) {
  return (
    <section className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {title}
        </h2>
        {seeAll === undefined ? null : (
          <Link
            href={seeAll}
            className="text-sm font-medium text-indigo-600 dark:text-indigo-400"
          >
            Tout voir
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
