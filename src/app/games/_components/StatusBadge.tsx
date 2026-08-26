/**
 * The chip at the end of a row of « Parties », saying whether there is still a
 * game waiting behind it. A sitting wears the same one as a party: an evening
 * with a deal on the table is something to go back to, exactly like the deal
 * itself, and giving the two rows different words would make them look like
 * different kinds of thing.
 */
export function StatusBadge({ ended }: Readonly<{ ended: boolean }>) {
  if (ended) {
    return (
      <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-white/10 dark:text-zinc-400">
        Terminée
      </span>
    );
  }

  return (
    <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
      Reprendre
    </span>
  );
}
