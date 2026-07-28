import type { PlayerId, TieBreakRecord } from "@/lib/domain";
import { formatNames } from "@/lib/game/tie-break";

/**
 * Explains, in the finished game's score recap, how a tie on the best score was
 * settled: who was level, which of the game's rules were applied and on what
 * values — or that none of them separated the players, so the victory is
 * shared. Deliberately *only* here: the end-of-game screen celebrates the
 * winner, it doesn't argue the rulebook.
 */
export function TieBreakRecap({
  record,
  nameOf,
}: Readonly<{
  record: TieBreakRecord;
  nameOf: (id: PlayerId) => string;
}>) {
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
      <h3 className="text-sm font-semibold">
        {record.shared ? "Victoire partagée 🤝" : "Égalité départagée"}
      </h3>
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        {formatNames(record.tied.map(nameOf))} ont terminé à égalité.
      </p>

      {record.steps.length > 0 ? (
        <ul className="flex flex-col gap-1 text-sm">
          {record.steps.map(step => (
            <li key={step.key}>
              <span className="font-medium">{step.label}</span>
              <span className="text-zinc-500 dark:text-zinc-400">
                {" — "}
                {Object.entries(step.values)
                  .map(([id, value]) => `${nameOf(id as PlayerId)} ${value}`)
                  .join(", ")}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {record.shared ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Aucune règle du jeu ne les départage.
        </p>
      ) : null}
    </section>
  );
}
