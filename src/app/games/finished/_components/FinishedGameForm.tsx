"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";

import { ErrorText } from "@/components/ErrorText";
import type { Boardgame, Player, PlayerId } from "@/lib/domain";
import { localDay } from "@/lib/game/game-filters";
import {
  pairBreakdown,
  pilesRemaining,
  scorePiles,
} from "@/lib/game/pair-scoring";
import { scoreCategories, winnerDirection } from "@/lib/game/scoring";
import { useBoardgames } from "@/lib/hooks/use-boardgames";
import { useGames } from "@/lib/hooks/use-games";
import { usePlayers } from "@/lib/hooks/use-players";
import {
  type CategoryRaw,
  CategoryScoreGrid,
  gridRemaining,
  gridValues,
} from "../../_components/CategoryScoreGrid";
import { PairScoreCircle } from "../../_components/PairScoreCircle";

/** Today where the reader is, for the default end-date field. */
function today(): string {
  return localDay(new Date().toISOString());
}

const sectionClass =
  "flex flex-col gap-3 rounded-xl border border-black/10 p-4 dark:border-white/10";

/** What the alternative to a plain total is called on this game's own sheet. */
function detailLabel(pairs: boolean): string {
  if (pairs) {
    return "Tas partagés";
  }

  return "Détail par catégorie";
}

export function FinishedGameForm() {
  const router = useRouter();
  const { boardgames } = useBoardgames();
  const { players } = usePlayers();
  const { createFinished } = useGames();

  const [boardgame, setBoardgame] = useState<Boardgame | null>(null);
  const [selected, setSelected] = useState<Player[]>([]);
  const [endedAt, setEndedAt] = useState(today());
  const [totals, setTotals] = useState<Record<string, string>>({});
  // For a game with a sheet of its own: enter just the final total, or the
  // detail the game is really scored on (per-category values, shared piles).
  const [entryMode, setEntryMode] = useState<"total" | "detail">("total");
  const [catRaw, setCatRaw] = useState<CategoryRaw>({});
  const [piles, setPiles] = useState<Record<string, number>>({});
  // Null while the form's own suggestion stands; set once the table picks.
  const [winnerIds, setWinnerIds] = useState<PlayerId[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const games = boardgames.filter(b => b.isActive && b.kind === "competitive");
  const activePlayers = players.filter(p => p.isActive);

  const scoring = boardgame?.scoring ?? null;
  const sheet =
    scoring?.entry === "categories" ? (scoring.sheet ?? null) : null;
  const pairs = scoring?.entry === "pairs";
  const ids = selected.map(p => p.id);
  const namedPlayers = selected.map(p => ({ id: p.id, name: p.name }));

  // The two sheets a game can be scored on, each entered instead of a plain
  // total. Both are optional here: a game recorded after the fact is often only
  // remembered as its final scores.
  const catMode = sheet !== null && entryMode === "detail";
  const pairMode = pairs && entryMode === "detail";
  const catValues = catMode ? gridValues(selected, sheet, catRaw) : null;
  const pairScores = pairMode ? scorePiles(ids, piles) : null;
  const remainingPiles = pairMode ? pilesRemaining(ids, piles) : 0;
  const remainingCells = catMode ? gridRemaining(selected, sheet, catRaw) : 0;
  const detailComplete =
    (catMode && remainingCells === 0) || (pairMode && remainingPiles === 0);

  // Final score per player, per the game's scoring model.
  const scored =
    catMode && catValues ? scoreCategories(sheet, catValues, ids) : null;

  // Whichever sheet the game is being entered on, the total it gives each
  // player — and nothing at all while it is incomplete: a missing category, or
  // a pile nobody counted, would read as a genuine zero.
  const usesSheet = catMode || pairMode;
  const sheetTotals: Record<string, { total: number }> | null = detailComplete
    ? (scored ?? pairScores)
    : null;

  function scoreOf(id: PlayerId): number | null {
    if (scoring === null) {
      return null;
    }

    if (usesSheet) {
      return sheetTotals?.[id]?.total ?? null;
    }

    const n = Number.parseInt(totals[id] ?? "", 10);

    return Number.isFinite(n) ? n : null;
  }

  /** The detail kept behind a total, for the sheet it was entered on. */
  function breakdownOf(id: PlayerId): Record<string, number> | null {
    if (catValues) {
      return catValues[id] ?? {};
    }

    if (pairScores) {
      return pairBreakdown(pairScores[id]);
    }

    return null;
  }

  const scoresComplete =
    scoring === null || selected.every(p => scoreOf(p.id) !== null);

  // The players sharing the best score. The winner is only worth asking about
  // on a TIE: then the table says who takes it — one of them, or all of them on
  // a shared victory. Otherwise it's simply the top scorer, no picker. An
  // unscored game has no score, so its winner is always picked (everyone).
  const winnerCandidates: Player[] = (() => {
    if (scoring === null) {
      return selected;
    }

    if (!scoresComplete) {
      return [];
    }

    // A sheet is always read highest-first, whether it sums or multiplies.
    const direction =
      sheet !== null || pairs
        ? "highest"
        : winnerDirection(scoring.winCondition);
    const withScore = selected.map(p => ({
      p,
      score: scoreOf(p.id) as number,
    }));
    const best = withScore.reduce(
      (b, x) =>
        direction === "highest" ? Math.max(b, x.score) : Math.min(b, x.score),
      withScore[0]?.score ?? 0,
    );

    return withScore.filter(x => x.score === best).map(x => x.p);
  })();

  const needsWinnerChoice =
    scoring === null ? selected.length >= 1 : winnerCandidates.length > 1;
  // A scored game proposes its co-leaders (one of them when there is a clear
  // top scorer, all of them on a tie — a shared victory until narrowed down);
  // an unscored one has nothing to propose.
  const suggestedWinners =
    scoring === null ? [] : winnerCandidates.map(p => p.id);
  const effectiveWinners = winnerIds ?? suggestedWinners;
  const sharedVictory = effectiveWinners.length > 1;

  function toggleWinner(id: PlayerId) {
    setWinnerIds(
      effectiveWinners.includes(id)
        ? effectiveWinners.filter(w => w !== id)
        : [...effectiveWinners, id],
    );
  }

  function chooseBoardgame(b: Boardgame) {
    setBoardgame(b);
    setTotals({});
    setCatRaw({});
    setPiles({});
    // A category sheet is long to fill in after the fact, so it opens on the
    // total. Shared piles are the opposite: they are what was on the table, and
    // the total is the multiplication the app is there to do.
    setEntryMode(b.scoring?.entry === "pairs" ? "detail" : "total");
    setWinnerIds(null);
  }

  function togglePlayer(p: Player) {
    setWinnerIds(null);
    // A pile is named after its place round the table, so changing who sits
    // there makes the counted ones meaningless.
    setPiles({});
    setSelected(prev =>
      prev.some(s => s.id === p.id)
        ? prev.filter(s => s.id !== p.id)
        : [...prev, p],
    );
  }

  const canSubmit =
    boardgame !== null &&
    selected.length >= 2 &&
    scoresComplete &&
    effectiveWinners.length > 0 &&
    !submitting;

  async function submit() {
    if (!boardgame || effectiveWinners.length === 0) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await createFinished({
        boardgameId: boardgame.id,
        endedAt: new Date(`${endedAt}T12:00:00`).toISOString(),
        winnerIds: effectiveWinners,
        players: selected.map((p, index) => ({
          playerId: p.id,
          seatOrder: index,
          score: scoreOf(p.id),
          breakdown: breakdownOf(p.id),
        })),
      });
      router.push("/games");
    } catch {
      setError("Impossible d'enregistrer la partie.");
      setSubmitting(false);
    }
  }

  // How the scores are asked for: the game's own sheet when the table kept it,
  // a plain total per player otherwise.
  let scoreEntry: ReactNode = (
    <TotalScoreFields
      players={namedPlayers}
      totals={totals}
      allowNegative={scoring?.allowNegative ?? false}
      onTotal={(id, text) => {
        setWinnerIds(null);
        setTotals(t => ({ ...t, [id]: text }));
      }}
    />
  );

  if (catMode) {
    scoreEntry = (
      <div className="flex flex-col gap-2">
        <CategoryScoreGrid
          players={namedPlayers}
          sheet={sheet}
          raw={catRaw}
          disabled={submitting}
          onCell={(pid, key, text) => {
            setWinnerIds(null);
            setCatRaw(r => ({
              ...r,
              [pid]: { ...(r[pid] ?? {}), [key]: text },
            }));
          }}
        />
        {detailComplete && scored ? (
          <ul className="flex flex-col gap-1 text-sm">
            {selected.map(p => (
              <li key={p.id} className="flex justify-between">
                <span>{p.name}</span>
                <span className="font-medium tabular-nums">
                  {scored[p.id]?.total ?? 0} pts
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Encore {remainingCells} case{remainingCells > 1 ? "s" : ""} à
            remplir.
          </p>
        )}
      </div>
    );
  } else if (pairMode) {
    scoreEntry = (
      <div className="flex flex-col gap-2">
        <PairScoreCircle
          seats={namedPlayers}
          piles={piles}
          onPile={(key, value) => {
            setWinnerIds(null);
            setPiles(p => ({ ...p, [key]: value }));
          }}
          disabled={submitting}
        />
        {remainingPiles > 0 ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Encore {remainingPiles} tas à compter.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section className={sectionClass}>
        <h2 className="text-sm font-semibold">Jeu</h2>
        <div className="flex flex-wrap gap-2">
          {games.map(b => (
            <button
              key={b.id}
              type="button"
              onClick={() => chooseBoardgame(b)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                boardgame?.id === b.id
                  ? "border-indigo-500 bg-indigo-600 text-white"
                  : "border-black/15 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>
      </section>

      {boardgame ? (
        <section className={sectionClass}>
          <h2 className="text-sm font-semibold">
            Joueurs{" "}
            <span className="text-zinc-400">(dans l&apos;ordre de jeu)</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {activePlayers.map(p => {
              const seat = selected.findIndex(s => s.id === p.id);

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePlayer(p)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                    seat >= 0
                      ? "border-indigo-500 bg-indigo-600 text-white"
                      : "border-black/15 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
                  }`}
                >
                  {seat >= 0 ? (
                    <span className="tabular-nums opacity-80">{seat + 1}.</span>
                  ) : null}
                  {p.name}
                </button>
              );
            })}
          </div>
          {selected.length < 2 ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Sélectionne au moins deux joueurs.
            </p>
          ) : null}
        </section>
      ) : null}

      {boardgame && selected.length >= 2 ? (
        <section className={sectionClass}>
          <h2 className="text-sm font-semibold">Résultat</h2>

          <label className="flex items-center justify-between gap-2 text-sm">
            Date de fin
            <input
              type="date"
              value={endedAt}
              max={today()}
              onChange={e => setEndedAt(e.target.value)}
              className="rounded-lg border border-black/15 bg-white px-2 py-1 outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900"
            />
          </label>

          {scoring !== null ? (
            <div className="flex flex-col gap-3">
              {sheet !== null || pairs ? (
                <div className="flex flex-wrap gap-2 text-sm">
                  {(["total", "detail"] as const).map(mode => (
                    <label
                      key={mode}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-medium transition ${
                        entryMode === mode
                          ? "border-indigo-500 bg-indigo-600 text-white"
                          : "border-black/15 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
                      }`}
                    >
                      <input
                        type="radio"
                        name="entryMode"
                        className="sr-only"
                        checked={entryMode === mode}
                        onChange={() => {
                          setWinnerIds(null);
                          setEntryMode(mode);
                        }}
                      />
                      {mode === "total" ? "Score total" : detailLabel(pairs)}
                    </label>
                  ))}
                </div>
              ) : null}

              {scoreEntry}
            </div>
          ) : null}

          {needsWinnerChoice ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">
                {sharedVictory ? "Vainqueurs" : "Vainqueur"}
                {scoring !== null ? (
                  <span className="font-normal text-zinc-500 dark:text-zinc-400">
                    {" "}
                    · égalité au score
                  </span>
                ) : null}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Plusieurs noms = victoire partagée.
              </span>
              {winnerCandidates.map(p => {
                const isWinner = effectiveWinners.includes(p.id);

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleWinner(p.id)}
                    className={`flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                      isWinner
                        ? "border-indigo-500 bg-indigo-600 text-white"
                        : "border-black/15 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
                    }`}
                  >
                    {p.name}
                    {isWinner ? <span aria-hidden>🏆</span> : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </section>
      ) : null}

      <ErrorText message={error} />

      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit}
        className="self-start rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
      >
        {submitting ? "Enregistrement…" : "Enregistrer la partie"}
      </button>
    </div>
  );
}

/** One final total per player, for a game with no sheet to fill in. */
function TotalScoreFields({
  players,
  totals,
  allowNegative,
  onTotal,
}: {
  players: Array<{ id: PlayerId; name: string }>;
  totals: Record<string, string>;
  allowNegative: boolean;
  onTotal: (id: PlayerId, text: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">Score final</span>
      {players.map(p => (
        <label
          key={p.id}
          className="flex items-center justify-between gap-2 text-sm"
        >
          {p.name}
          <input
            type="number"
            inputMode="numeric"
            min={allowNegative ? undefined : 0}
            value={totals[p.id] ?? ""}
            onChange={e => onTotal(p.id, e.target.value)}
            className="no-spinners w-20 rounded-lg border border-black/15 bg-white px-2 py-1 text-right tabular-nums outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900"
          />
        </label>
      ))}
    </div>
  );
}
