import Link from "next/link";
import type { ReactNode } from "react";

/** How a tile's icon is tinted: the parties in indigo, the tools in amber. */
export type TileTone = "play" | "tool";

const TONE: Record<TileTone, string> = {
  play: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
  tool: "bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
};

export interface HomeTileItem {
  href: string;
  label: string;
  icon: ReactNode;
  tone: TileTone;
}

/** One shortcut of the home page: an icon in its tinted square, and its name. */
export function HomeTile({ tile }: Readonly<{ tile: HomeTileItem }>) {
  return (
    <Link
      href={tile.href}
      className="flex h-14 items-center gap-2.5 rounded-xl border border-black/10 bg-white px-3 text-sm font-medium transition hover:border-indigo-400 dark:border-white/10 dark:bg-zinc-900"
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${TONE[tile.tone]}`}
      >
        {tile.icon}
      </span>
      {tile.label}
    </Link>
  );
}
