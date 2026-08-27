import type { ReactNode } from "react";

import { InfoTip } from "@/components/InfoTip";

/**
 * A tinted panel holding the several readings of **one** subject.
 *
 * The statistics screens stack their sections with nothing between them but a
 * gap, which is fine while a section is one chart: the title above it names it
 * and the reader is never in doubt. It stops being fine as soon as a subject is
 * read twice — « le temps par phase sur toutes les parties » then « le temps
 * par phase génération par génération » sit one under the other, and only the
 * first title is in sight when the eye lands on the second chart.
 *
 * Hence the box: it says where a subject starts and stops. It is deliberately
 * **not** a bordered card — the lists inside carry their own borders, and a
 * second frame around them would read as a nesting that means nothing. A tint
 * groups without drawing another line.
 *
 * Used only where a section really holds several readings; a lone chart keeps
 * its bare title, since there is nothing to tell apart.
 */
export function StatGroup({
  title,
  children,
}: Readonly<{ title: ReactNode; children: ReactNode }>) {
  return (
    <div
      data-testid="stat-group"
      className="flex flex-col gap-4 rounded-xl bg-black/[0.03] p-3 sm:p-4 dark:bg-white/[0.04]"
    >
      <h3 className="flex items-center gap-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">
        {title}
      </h3>
      {children}
    </div>
  );
}

/**
 * One reading inside a {@link StatGroup}: what it shows, and an « i » saying
 * which figures it rests on.
 *
 * The explanation lives in a bubble rather than under the chart because these
 * are read on a phone: a paragraph per chart would push the next one off the
 * screen, and the question « sur quoi cette moyenne est-elle calculée ? » is
 * asked once, not at every glance.
 */
export function StatView({
  title,
  info,
  children,
}: Readonly<{
  /** Names this reading — « Sur toutes les parties », « Génération par génération ». */
  title: string;
  info: ReactNode;
  children: ReactNode;
}>) {
  return (
    <div className="flex flex-col gap-2">
      <h4 className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
        {title}
        <InfoTip label={title}>{info}</InfoTip>
      </h4>
      {children}
    </div>
  );
}
