import type { ReactNode } from "react";

/** A one-line fact worth pulling out of the end-of-game numbers. */
export function TallyHighlight({
  emoji,
  children,
}: Readonly<{ emoji: string; children: ReactNode }>) {
  return (
    <p className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-3 text-sm">
      <span aria-hidden>{emoji}</span>
      <span>{children}</span>
    </p>
  );
}
