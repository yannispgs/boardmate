"use client";

import { useState } from "react";

import type { PlayerId, PopulatedGame } from "@/lib/domain";
import { readPairBreakdown } from "@/lib/game/pair-scoring";
import { finalStandings, winnerDirection } from "@/lib/game/scoring";
import { useScoreRecords } from "@/lib/hooks/use-score-records";
import { CategoryBreakdownFill } from "./CategoryBreakdownFill";
import { FinalScoreTable } from "./FinalScoreTable";
import { RecordBadgeList } from "./RecordBadgeList";
import { TieBreakRecap } from "./TieBreakRecap";

/**
 * The finished game's final score, shown in the right slide-over. Players are
 * listed best-first with their score (honouring the game's win direction). For
 * a category game whose per-category detail was recorded, a toggle expands the
 * full scoresheet under the ranking — the base total stays the headline. A
 * category game recorded with only totals offers, instead, to add that detail
 * here.
 */
export function EndScorePanel({
  game,
  onClose,
  onReload,
}: Readonly<{
  game: PopulatedGame;
  onClose: () => void;
  onReload: () => void;
}>) {
  const scoring = game.boardgame.scoring;
  const sheet =
    scoring?.entry === "categories" ? (scoring.sheet ?? null) : null;
  const direction = scoring ? winnerDirection(scoring.winCondition) : "highest";

  const players = game.players.map(p => ({
    id: p.playerId,
    name: p.player.name,
    score: p.score ?? 0,
    isWinner: p.isWinner,
    // A pair-scored game (Splito) keeps the two shared piles behind the total,
    // and the multiplication is the whole story — no toggle to hide it behind.
    pair:
      scoring?.entry === "pairs" ? readPairBreakdown(p.scoreBreakdown) : null,
  }));

  // The recorded winners take rank 1 (several on a shared victory); co-leaders
  // on the same score who lost the tie-break are 2nd. Shared ranks resume from
  // 2nd place down.
  const ranking = finalStandings(
    players.map(p => ({
      playerId: p.id,
      score: p.score,
      isWinner: p.isWinner,
    })),
    direction,
  );
  const rankOf = (id: PlayerId) => ranking.find(r => r.playerId === id);
  const ordered = [...players].sort(
    (a, b) => (rankOf(a.id)?.rank ?? 0) - (rankOf(b.id)?.rank ?? 0),
  );
  // The records this party took, so they are still there when the score is
  // looked up again long after the reveal that announced them.
  const records = useScoreRecords(
    game,
    ranking,
    players.filter(p => p.isWinner).map(p => p.id),
  );

  // The per-category breakdown is only available when every player has one
  // stored (a total-only game, or a category game recorded without detail, has
  // none → we show just the totals).
  const values: Record<string, Record<string, number>> = {};
  for (const p of game.players) {
    values[p.playerId] = p.scoreBreakdown ?? {};
  }
  const hasDetail =
    sheet !== null && game.players.every(p => p.scoreBreakdown !== null);
  // A category game logged with only totals can be completed with its
  // per-category detail from here (e.g. a game added after the fact).
  const canFill =
    sheet !== null && game.players.every(p => p.scoreBreakdown === null);

  const [showDetail, setShowDetail] = useState(false);

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Score final</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="rounded-full p-1 text-zinc-500 transition hover:bg-black/5 dark:hover:bg-white/10"
        >
          <span aria-hidden className="text-xl leading-none">
            ×
          </span>
        </button>
      </div>

      <ol className="flex flex-col gap-1.5">
        {ordered.map(p => {
          const rank = rankOf(p.id)?.rank ?? 0;

          return (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-xl border border-black/10 bg-white px-3 py-2.5 dark:border-white/10 dark:bg-zinc-900"
            >
              <span className="w-6 text-center text-sm font-semibold tabular-nums text-zinc-500 dark:text-zinc-400">
                {rank === 1 ? "🏆" : rank}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{p.name}</span>

                {p.pair ? (
                  <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                    {p.pair.left} × {p.pair.right}
                  </span>
                ) : null}
              </span>
              <span className="text-lg font-semibold tabular-nums">
                {p.score}
              </span>

              <RecordBadgeList records={records.get(p.id) ?? []} />
            </li>
          );
        })}
      </ol>

      {game.tieBreak ? (
        <TieBreakRecap
          record={game.tieBreak}
          nameOf={id => players.find(p => p.id === id)?.name ?? "Joueur"}
        />
      ) : null}

      {hasDetail ? (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setShowDetail(v => !v)}
            className="self-start text-sm font-medium text-indigo-600 transition hover:text-indigo-500 dark:text-indigo-400"
          >
            {showDetail
              ? "Masquer le détail des points"
              : "Voir le détail des points"}
          </button>

          {showDetail ? (
            <FinalScoreTable
              sheet={sheet}
              players={players.map(p => ({ id: p.id, name: p.name }))}
              values={values}
              ranking={ranking}
            />
          ) : null}
        </div>
      ) : null}

      {canFill ? (
        <CategoryBreakdownFill game={game} onSaved={onReload} />
      ) : null}
    </div>
  );
}
