"use client";

import type { Player, PlayerId, TieBreakRule } from "@/lib/domain";

/**
 * Who takes the game, asked whenever the sheet doesn't settle it: an unscored
 * game (nothing to read a winner from) or a tie at the top.
 *
 * Framed as a warning rather than one more field — it is the only thing left on
 * this screen the table has to decide, and the party stays unrecordable until
 * it does. It **names** the game's own tie-break rule so the table can apply it
 * over the box, then takes back the answer alone: the value it was settled on
 * is the first thing forgotten weeks later, the winner the last.
 */
export function WinnerChoice({
  candidates,
  winners,
  tied,
  rules,
  onToggle,
  onShare,
}: Readonly<{
  candidates: Player[];
  winners: PlayerId[];
  /** Whether the players are level on a score — an unscored game has no tie. */
  tied: boolean;
  /** The game's secondary rules, in the order its rulebook runs them. */
  rules: TieBreakRule[];
  onToggle: (id: PlayerId) => void;
  onShare: () => void;
}>) {
  const shared = winners.length > 1 && winners.length === candidates.length;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-3">
      <span className="text-sm font-semibold">
        {tied ? "Égalité — qui a gagné ? 🤝" : "Qui a gagné ?"}
      </span>

      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        {tied
          ? "Départage la partie à table, puis désigne le vainqueur. La valeur qui a tranché n'est pas demandée."
          : "Ce jeu ne compte pas de points : désigne le vainqueur."}
      </p>

      {rules.length > 0 ? (
        <div className="flex flex-col gap-0.5 text-xs">
          <span className="font-medium">
            {rules.length > 1 ? "Règles de départage" : "Règle de départage"}
          </span>
          <ul className="flex flex-col gap-0.5 text-zinc-600 dark:text-zinc-400">
            {rules.map(rule => (
              <li key={rule.key}>
                {rule.help ? `${rule.label} — ${rule.help}` : rule.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {candidates.map(p => {
        const isWinner = !shared && winners.includes(p.id);

        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onToggle(p.id)}
            className={`flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
              isWinner
                ? "border-indigo-500 bg-indigo-600 text-white"
                : "border-black/15 bg-white hover:bg-black/5 dark:border-white/15 dark:bg-zinc-900 dark:hover:bg-white/5"
            }`}
          >
            <span>{p.name}</span>
            {isWinner ? <span aria-hidden>🏆</span> : null}
          </button>
        );
      })}

      {candidates.length > 1 ? (
        <button
          type="button"
          onClick={onShare}
          className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
            shared
              ? "border-indigo-500 bg-indigo-600 text-white"
              : "border-black/15 bg-white hover:bg-black/5 dark:border-white/15 dark:bg-zinc-900 dark:hover:bg-white/5"
          }`}
        >
          Victoire partagée
        </button>
      ) : null}
    </div>
  );
}
