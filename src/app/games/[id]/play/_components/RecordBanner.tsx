/**
 * The one thing a party leaves behind that outlives it, said out loud under the
 * winner: a record has changed hands. The shell only — what kind of record, and
 * how it reads, belongs to the banner that fills it in.
 *
 * A personal best never comes through here: it is read on the score sheet, line
 * by line, because on a table of five newcomers nearly everyone beats his own
 * and the record would drown in them.
 */
export function RecordBanner({
  icon,
  title,
  detail,
}: Readonly<{ icon: string; title: string; detail: string }>) {
  return (
    <p className="mt-2 flex flex-col items-center gap-0.5 rounded-xl border border-amber-500/30 bg-amber-500/[0.08] px-4 py-2">
      <span className="font-semibold text-amber-700 dark:text-amber-300">
        {`${icon} ${title} battu !`}
      </span>
      <span className="text-sm text-amber-700/80 dark:text-amber-300/80">
        {detail}
      </span>
    </p>
  );
}
