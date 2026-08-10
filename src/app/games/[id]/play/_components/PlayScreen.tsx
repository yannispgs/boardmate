"use client";

import { useRouter } from "next/navigation";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ErrorText } from "@/components/ErrorText";
import type {
  GameId,
  PlayerId,
  PopulatedGame,
  TieBreakRecord,
  WinCondition,
} from "@/lib/domain";
import { countdownColor } from "@/lib/game/colors";
import { diceStats, diceValues } from "@/lib/game/dice";
import { pairBreakdown, scorePiles } from "@/lib/game/pair-scoring";
import {
  clampScore,
  type Ranked,
  rankByTotal,
  rankFinalScores,
  scoreCategories,
  winnerDirection,
} from "@/lib/game/scoring";
import { liveTimeHog } from "@/lib/game/stats";
import {
  loneLeader,
  resolveTieBreak,
  tieBreakRecord,
} from "@/lib/game/tie-break";
import { isFinalTurn, turnsPerRound } from "@/lib/game/turn";
import { turnDurationForRound } from "@/lib/game/turn-schedule";
import { useTurnTimer } from "@/lib/hooks/use-turn-timer";
import { useWakeLock } from "@/lib/hooks/use-wake-lock";
import { getGameRepository } from "@/lib/repositories";
import { CategoryScoreEntry } from "../../../_components/CategoryScoreEntry";
import { PairScoreEntry } from "../../../_components/PairScoreEntry";
import { DiceBar } from "./DiceBar";
import { EndedGame } from "./EndedGame";
import { FaqPanel } from "./FaqPanel";
import { FinalScoreTable } from "./FinalScoreTable";
import { LiveEndPrompt } from "./LiveEndPrompt";
import { PairScoreTable } from "./PairScoreTable";
import { RankingReveal } from "./RankingReveal";
import { ScorePanel } from "./ScorePanel";
import { StatsPanel } from "./StatsPanel";
import { TieBreakPrompt } from "./TieBreakPrompt";
import { TurnFlow } from "./turn-flow";
import { WaitPicker } from "./WaitPicker";

/** Final scores about to be persisted, with the breakdown when there is one. */
type FinalScores = Array<{
  playerId: PlayerId;
  score: number;
  breakdown?: Record<string, number>;
}>;

/**
 * How a scored game came out, driving the reveal and then the score sheet.
 * Which sheet it was decides what that layout is: the per-category grid
 * (`values`), the ring of shared piles (`piles`), or neither.
 */
interface EndOutcome {
  scores: FinalScores;
  ranking: Ranked[];
  /** The per-category values to lay out after the reveal, or null. */
  values: Record<string, Record<string, number>> | null;
  /** The shared piles to lay out after the reveal, or null. */
  piles: Record<string, number> | null;
  /** Who won — empty while the leaders are level and the tie unbroken. */
  winners: PlayerId[];
}

export function PlayScreen({ gameId }: Readonly<{ gameId: GameId }>) {
  const repo = getGameRepository();
  const router = useRouter();
  const [game, setGame] = useState<PopulatedGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // A manual duration for the current turn, overriding the schedule; cleared
  // when the turn advances (below) so the next turn follows the schedule again.
  const [durationOverride, setDurationOverride] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  // Simultaneous games: the player the table is waiting on this round (tapped),
  // recorded when the round advances then cleared for the next round. The ref
  // holds when they were tapped, to time the wait (tap → advance).
  const [blockedById, setBlockedById] = useState<PlayerId | null>(null);
  const blockedAtRef = useRef<number | null>(null);

  // Tapping a player starts the wait clock; untapping (null) clears it.
  const pickBlocked = useCallback((id: PlayerId | null) => {
    setBlockedById(id);
    blockedAtRef.current = id === null ? null : Date.now();
  }, []);
  const [scoreOpen, setScoreOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  // Whether the end-of-game score form (final total / winner pick) is open —
  // when it is, it takes the timer's place.
  const [endFormOpen, setEndFormOpen] = useState(false);
  // Sheet scoring: the end sheet modal, then the reveal → table phases.
  const [catOpen, setCatOpen] = useState(false);
  const [pairOpen, setPairOpen] = useState(false);
  const [phase, setPhase] = useState<"play" | "reveal" | "table">("play");
  const [end, setEnd] = useState<EndOutcome | null>(null);
  // Opened from the reveal, once it has uncovered leaders that came out level:
  // the prompt then applies the game's own rules and confirms who won.
  const [tieOpen, setTieOpen] = useState(false);
  // Live running scores, seeded once from the loaded game then owned here so
  // they survive turn reloads and feed both the score panel and the end prompt.
  const [scores, setScores] = useState<Record<string, number> | null>(null);
  // Dice roll log (values in order), owned locally so a tap shows instantly;
  // each append also persists in the background.
  const [rolls, setRolls] = useState<number[] | null>(null);
  // Set when a tap is rejected because the per-turn roll cap is reached; shown
  // until the next turn (cleared when `game.turn` advances, below).
  const [rollCapNotice, setRollCapNotice] = useState(false);

  const timer = useTurnTimer();
  // Keep the screen awake while a turn is actively running; let it sleep on
  // pause / once the game ends, to spare the battery.
  useWakeLock(game?.status === "ongoing" && timer.running);

  const load = useCallback(async () => {
    try {
      setGame(await repo.getPopulated(gameId));
      setError(null);
    } catch {
      setError("Impossible de charger la partie.");
    } finally {
      setLoading(false);
    }
  }, [repo, gameId]);

  useEffect(() => {
    load();
  }, [load]);

  // Seed the live scores from the game the first time it loads (later turn
  // reloads must not clobber scores entered since).
  useEffect(() => {
    if (game && scores === null) {
      setScores(
        Object.fromEntries(game.players.map(p => [p.playerId, p.score ?? 0])),
      );
    }
  }, [game, scores]);

  // Seed the dice log once (rolls only ever append, so the local copy stays
  // authoritative across turn reloads).
  useEffect(() => {
    if (game && rolls === null) {
      setRolls(game.diceRolls.map(d => d.value));
    }
  }, [game, rolls]);

  // The roll-cap notice lasts only until the next turn: clear it whenever the
  // turn advances (the cap raises with it). `gameTurn` is read so it counts as a
  // real dependency (the effect exists to react to its change).
  const gameTurn = game?.turn;
  useEffect(() => {
    if (gameTurn !== undefined) {
      setRollCapNotice(false);
      // The manual duration is a one-turn tweak; the next turn follows the
      // schedule again.
      setDurationOverride(null);
    }
  }, [gameTurn]);

  // Unlock audio on the first interaction with the play screen: mobile browsers
  // only let an AudioContext start from a user gesture. iOS in particular needs
  // a touchend/click (not just pointerdown), so we listen broadly; re-running on
  // each event keeps it unlocked for the rest of the game.
  useEffect(() => {
    const handle = () => unlockAudio();
    const events = ["touchend", "pointerup", "mousedown", "keydown"] as const;

    for (const e of events) {
      window.addEventListener(e, handle);
    }

    return () => {
      for (const e of events) {
        window.removeEventListener(e, handle);
      }
    };
  }, []);

  // Decode the beep/ring up front so they're ready before the countdown.
  useEffect(() => {
    loadSound(BEEP_URL);
    loadSound(RING_URL);
  }, []);

  // The end score form replaces the timer once opened; pause the timer then so
  // it doesn't keep ticking (and running down the wake lock) behind the form.
  const scoreFormOpen = endFormOpen || catOpen || pairOpen;
  useEffect(() => {
    if (scoreFormOpen) {
      timer.pause();
    }
  }, [scoreFormOpen, timer.pause]);

  // Whoever is monopolising the table's time, judged on COMPLETED rounds only
  // (see liveTimeHog): it refreshes when the table moves to the next round —
  // not mid-round, where whoever is a turn ahead would look like the hog.
  const hog = game ? liveTimeHog(game.players, game.turns, game.round) : null;

  // The current turn's countdown: the schedule's duration for this round,
  // unless the user manually overrode it for the turn.
  const scheduledDurationS = game
    ? turnDurationForRound(game.turnSchedule, game.round)
    : 60;
  const durationS = durationOverride ?? scheduledDurationS;

  async function handleNext() {
    if (!game || busy) {
      return;
    }
    setBusy(true);

    // Snapshot the finished turn's numbers, then restart the timer *immediately*
    // — the new turn's clock starts on the click, not when Supabase replies, so
    // the countdown never keeps ticking during the async persist.
    const elapsedS = timer.elapsedS;
    const pauses = timer.pauseStats();
    const overtimeS = Math.max(0, elapsedS - durationS);
    const waitedSeconds =
      blockedById !== null && blockedAtRef.current !== null
        ? (Date.now() - blockedAtRef.current) / 1000
        : 0;
    const blocked = blockedById;
    timer.reset();
    pickBlocked(null);

    try {
      await repo.advanceTurn(
        game.id,
        elapsedS,
        pauses.count,
        pauses.durationS,
        overtimeS,
        {
          turnMode: game.boardgame.turnMode,
          blockedById: blocked,
          waitedSeconds,
        },
      );
      await load();
    } catch {
      setError("Impossible de passer au tour suivant.");
    } finally {
      setBusy(false);
    }
  }

  async function handleEnd(
    winnerIds: PlayerId[],
    scores?: FinalScores,
    tieBreak?: TieBreakRecord | null,
  ) {
    if (!game || busy) {
      return;
    }
    setBusy(true);
    try {
      await repo.end(game.id, winnerIds, scores, tieBreak ?? null);
      await load();
    } catch {
      setError("Impossible de terminer la partie.");
    } finally {
      setBusy(false);
    }
  }

  /** Records the finished game; false when it failed and the screen must stay. */
  async function persistEnd(
    outcome: EndOutcome,
    tieBreak: TieBreakRecord | null,
  ): Promise<boolean> {
    if (!game || busy) {
      return false;
    }
    setBusy(true);
    try {
      await repo.end(game.id, outcome.winners, outcome.scores, tieBreak);
    } catch {
      setError("Impossible de terminer la partie.");
      setBusy(false);

      return false;
    }

    setBusy(false);

    return true;
  }

  /**
   * Hands a finished scored game over to the reveal, which climbs the standings
   * from the last place to the first. A lone leader is recorded up front; level
   * leaders leave `winners` empty so nothing is written — and nothing shown —
   * until the reveal reaches their place and the table settles it there.
   */
  async function revealEnd(outcome: EndOutcome) {
    if (outcome.winners.length > 0 && !(await persistEnd(outcome, null))) {
      return;
    }

    setCatOpen(false);
    setPairOpen(false);
    setEndFormOpen(false);
    setEnd(outcome);
    setPhase("reveal");
  }

  /** Records the game once the reveal's tie-break has named the winners. */
  async function settleTie(
    winnerIds: PlayerId[],
    record: TieBreakRecord | null,
  ) {
    if (!end) {
      return;
    }

    const settled = { ...end, winners: winnerIds };

    if (!(await persistEnd(settled, record))) {
      return;
    }

    setTieOpen(false);
    setEnd(settled);
  }

  /** Leaves the reveal: the score sheet for a sheet-scored game, the recap for the rest. */
  async function leaveReveal() {
    if (end?.values || end?.piles) {
      setPhase("table");

      return;
    }

    setPhase("play");
    await load();
  }

  // Cooperative games end on a shared outcome (all win, or none).
  async function handleEndCoop(won: boolean) {
    if (!game || busy) {
      return;
    }
    setBusy(true);
    try {
      await repo.endCoop(game.id, won);
      await load();
    } catch {
      setError("Impossible de terminer la partie.");
    } finally {
      setBusy(false);
    }
  }

  // Live scoring: set a player's absolute total (clamped for positive-only
  // games), persist it, then offer to end when the target is reached OR
  // exceeded — a turn can bring several points at once.
  async function setPlayerScore(playerId: PlayerId, raw: number) {
    if (!game) {
      return;
    }

    const next = clampScore(raw, game.boardgame.scoring);

    setScores(s => ({ ...(s ?? {}), [playerId]: next }));
    try {
      await repo.setScore(game.id, playerId, next, game.round);
    } catch {
      setError("Impossible d'enregistrer le score.");

      return;
    }

    if (game.winThreshold !== null && next >= game.winThreshold) {
      // Close the score sheet and let the end prompt (which can override the
      // winner) take over — the two modals never stack.
      setScoreOpen(false);
      setEndOpen(true);
    }
  }

  // Records one dice roll: append locally for instant feedback, persist in bg.
  async function handleRoll(value: number) {
    if (!game) {
      return;
    }
    // Cap the log at the number of player-turns played so far (game.turn): it
    // lets you backfill missed rolls yet stops a stuck button from flooding the
    // data. Tapping past the cap records nothing and surfaces the explanation
    // (only then — not merely on reaching the cap).
    const current = rolls ?? [];
    if (current.length >= game.turn) {
      setRollCapNotice(true);

      return;
    }

    setRolls([...current, value]);
    try {
      await repo.addDiceRoll(game.id, value);
    } catch {
      setError("Impossible d'enregistrer le lancer.");
    }
  }

  // Category scoring: sum each player's sheet into a total, and rank them.
  async function handleCategoryFinish(
    values: Record<string, Record<string, number>>,
  ) {
    const sheet = game?.boardgame.scoring?.sheet;
    if (!game || !sheet || busy) {
      return;
    }

    const scored = scoreCategories(
      sheet,
      values,
      game.players.map(p => p.playerId),
    );
    const ranking = rankByTotal(
      game.players.map(p => ({
        playerId: p.playerId,
        total: scored[p.playerId]?.total ?? 0,
      })),
    );
    const scores = game.players.map(p => ({
      playerId: p.playerId,
      score: scored[p.playerId]?.total ?? 0,
      breakdown: values[p.playerId] ?? {},
    }));
    // A category sheet is always summed highest-first, so the leader is the
    // player alone on rank 1 — nobody while several share it.
    const leader = loneLeader(scores, "highest");

    await revealEnd({
      scores,
      ranking,
      values,
      piles: null,
      winners: leader ? [leader] : [],
    });
  }

  // Pair scoring (Splito): each player's total is the product of the two piles
  // flanking his seat, so the piles entered once around the ring score everyone.
  async function handlePairFinish(piles: Record<string, number>) {
    if (!game || busy) {
      return;
    }

    const seats = game.players.map(p => p.playerId);
    const scored = scorePiles(seats, piles);
    const ranking = rankByTotal(
      seats.map(playerId => ({
        playerId,
        total: scored[playerId].total,
      })),
    );
    const scores = seats.map(playerId => ({
      playerId,
      score: scored[playerId].total,
      breakdown: pairBreakdown(scored[playerId]),
    }));
    // The product is always read highest-first, like a category sheet.
    const leader = loneLeader(scores, "highest");

    await revealEnd({
      scores,
      ranking,
      values: null,
      piles,
      winners: leader ? [leader] : [],
    });
  }

  /**
   * A game scored on a final total: the leader wins, unless the table named
   * someone else by hand (`override`) or several players finished level — the
   * reveal then offers to apply the game's own rules once it gets there.
   */
  async function handleFinalScores(
    scores: Array<{ playerId: PlayerId; score: number }>,
    override: PlayerId | null,
  ) {
    if (!game) {
      return;
    }

    const direction = game.boardgame.scoring
      ? winnerDirection(game.boardgame.scoring.winCondition)
      : "highest";
    const leader = override ?? loneLeader(scores, direction);

    await revealEnd({
      scores,
      ranking: rankFinalScores(scores, direction),
      values: null,
      piles: null,
      winners: leader ? [leader] : [],
    });
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Chargement…</p>;
  }
  if (error && !game) {
    return <ErrorText message={error} />;
  }
  if (!game) {
    return <p className="text-sm text-zinc-500">Partie introuvable.</p>;
  }

  const namedPlayers = game.players.map(p => ({
    id: p.playerId,
    name: p.player.name,
  }));
  // The boardgame's own secondary rules, for a game that ends level.
  const tieRules = game.boardgame.scoring?.tieBreak ?? [];

  // Scoring flow takes over the screen: reveal the ranking, then the sheet.
  if (phase === "reveal" && end) {
    return (
      <>
        <RankingReveal
          ranking={end.ranking}
          players={namedPlayers}
          winners={end.winners}
          tieBreak={
            end.winners.length === 0
              ? {
                  // No rule in the box means the reveal can only offer to share
                  // the win, so the button says so rather than promising more.
                  label:
                    tieRules.length > 0 ? "Départager" : "Victoire partagée",
                  onOpen: () => setTieOpen(true),
                }
              : null
          }
          onDone={leaveReveal}
        />

        {tieOpen ? (
          <TieBreakPrompt
            players={namedPlayers}
            scores={Object.fromEntries(
              end.scores.map(s => [s.playerId, s.score]),
            )}
            direction={
              game.boardgame.scoring
                ? winnerDirection(game.boardgame.scoring.winCondition)
                : "highest"
            }
            rules={tieRules}
            currentPlayerId={game.currentPlayerId}
            onConfirm={settleTie}
            onCancel={() => setTieOpen(false)}
            disabled={busy}
          />
        ) : null}
      </>
    );
  }
  if (phase === "table" && end?.piles) {
    return (
      <PairScoreTable
        seats={namedPlayers}
        piles={end.piles}
        ranking={end.ranking}
        onDone={() => router.push("/games")}
      />
    );
  }
  if (phase === "table" && end?.values) {
    return (
      <FinalScoreTable
        sheet={game.boardgame.scoring?.sheet ?? []}
        players={namedPlayers}
        values={end.values}
        ranking={end.ranking}
        onDone={() => router.push("/games")}
      />
    );
  }

  if (game.status === "ended") {
    return <EndedGame game={game} onReload={load} />;
  }

  const remainingS = durationS - timer.elapsedS;

  // Fixed-length games (e.g. Cascadia's 20 rounds) end on the last seat of the
  // last round: no more turns, and the scoring UI takes over. Open-ended games
  // keep their end controls available throughout.
  const roundLimit = game.boardgame.roundLimit;
  // A simultaneous round is one shared turn, so a "round" is a single turn.
  const simultaneous = game.boardgame.turnMode === "simultaneous";
  // Cooperative games end on a shared outcome, not by picking a winner.
  const coop = game.boardgame.kind === "cooperative";
  const perRound = turnsPerRound(game.boardgame.turnMode, game.players.length);
  const atFinalTurn = isFinalTurn(game.turn, perRound, roundLimit);
  const canEnd = roundLimit === null || atFinalTurn;

  // Live scoring: who the target-reached prompt proposes as winner, already
  // resolved through those rules (Catan hands the tie to whoever holds the turn).
  const liveOutcome = resolveTieBreak(
    game.players.map(p => ({
      playerId: p.playerId,
      score: scores?.[p.playerId] ?? 0,
    })),
    "highest",
    tieRules,
    { currentPlayerId: game.currentPlayerId },
  );

  // Dice tracking (Catan): a one-tap histogram sharing the screen with a
  // slimmed-down timer.
  const dice = game.boardgame.dice;
  const rollValues = rolls ?? [];
  const diceRange = dice ? diceValues(dice) : [];
  const dStats = dice ? diceStats(rollValues, diceRange) : {};
  const lastRolled = rollValues.at(-1) ?? null;

  // How the game ends depends on how it is scored: a shared outcome for a
  // cooperative game, one of the two end-of-game sheets, a plain final total,
  // or — when nothing is scored at all — a winner named by the table.
  const finalScoring =
    game.boardgame.scoring?.timing === "final" ? game.boardgame.scoring : null;
  let endControl: ReactNode = (
    <WinnerPicker
      players={game.players.map(p => p.player)}
      onPick={winnerIds => {
        // Picked by hand: several names is a shared victory the table decided
        // on, with no score to explain it.
        handleEnd(
          winnerIds,
          undefined,
          winnerIds.length > 1
            ? { tied: winnerIds, steps: [], shared: true }
            : null,
        );
      }}
      disabled={busy}
      open={endFormOpen}
      onOpenChange={setEndFormOpen}
    />
  );

  if (coop) {
    endControl = (
      <CoopEnd
        open={endFormOpen}
        onOpenChange={setEndFormOpen}
        onEnd={handleEndCoop}
        disabled={busy}
      />
    );
  } else if (finalScoring?.entry === "pairs") {
    endControl = (
      <>
        <CountPointsButton onClick={() => setPairOpen(true)} disabled={busy} />
        {pairOpen ? (
          <PairScoreEntry
            seats={namedPlayers}
            onSubmit={handlePairFinish}
            onCancel={() => setPairOpen(false)}
            disabled={busy}
          />
        ) : null}
      </>
    );
  } else if (finalScoring?.entry === "categories" && finalScoring.sheet) {
    const sheet = finalScoring.sheet;

    endControl = (
      <>
        <CountPointsButton onClick={() => setCatOpen(true)} disabled={busy} />
        {catOpen ? (
          <CategoryScoreEntry
            players={namedPlayers}
            sheet={sheet}
            onSubmit={handleCategoryFinish}
            onCancel={() => setCatOpen(false)}
            disabled={busy}
          />
        ) : null}
      </>
    );
  } else if (finalScoring) {
    endControl = (
      <ScoreEntry
        players={game.players.map(p => p.player)}
        winCondition={finalScoring.winCondition}
        onEnd={handleFinalScores}
        disabled={busy}
        open={endFormOpen}
        onOpenChange={setEndFormOpen}
      />
    );
  }

  return (
    <div className="flex flex-col items-center gap-8">
      {hog ? (
        <div className="flex w-full max-w-sm items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-3 text-sm">
          <span aria-hidden>⏱️</span>
          <span>
            <span className="font-semibold">{hog.name}</span> monopolise le
            temps ({Math.round(hog.sharePct)} %)
          </span>
        </div>
      ) : null}

      <p className="text-sm uppercase tracking-wide text-zinc-400">
        Tour {game.round}
        {roundLimit !== null ? ` / ${roundLimit}` : ""}
      </p>

      {/* The whole play block (who's up / countdown / dice) gives way to the
          score form once you end the game. */}
      {scoreFormOpen ? null : (
        <>
          {simultaneous ? (
            <WaitPicker
              players={game.players.map(p => p.player)}
              value={blockedById}
              onChange={pickBlocked}
            />
          ) : (
            <TurnFlow
              players={game.players.map(p => p.player)}
              currentPlayerId={game.currentPlayerId}
              round={game.round}
              roundLimit={roundLimit}
            />
          )}

          <TimerRing
            remainingS={remainingS}
            durationS={durationS}
            running={timer.running}
            onToggle={timer.toggle}
            size={dice ? 168 : undefined}
          />

          <DurationEditor
            durationS={durationS}
            onChange={s => setDurationOverride(s)}
            onPause={timer.pause}
          />

          {dice ? (
            <DiceBar
              values={diceRange}
              stats={dStats}
              lastRolled={lastRolled}
              onRoll={handleRoll}
              disabled={game.status !== "ongoing"}
              capNotice={rollCapNotice}
              maxRolls={game.turn}
            />
          ) : null}
        </>
      )}

      <ErrorText message={error} />

      {scoreFormOpen ? null : atFinalTurn ? (
        <p className="text-center text-sm font-semibold text-amber-600 dark:text-amber-400">
          Dernier tour — terminez la partie pour compter les points.
        </p>
      ) : (
        <button
          type="button"
          onClick={handleNext}
          disabled={busy}
          className="w-full max-w-xs rounded-xl bg-indigo-600 px-6 py-4 text-lg font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          Tour suivant →
        </button>
      )}

      <FaqPanel boardgame={game.boardgame} extensions={game.extensions} />

      {simultaneous ? null : (
        <StatsPanel
          players={game.players}
          turns={game.turns}
          currentRound={game.round}
          dice={dice ? { rolls: rollValues, spec: dice } : undefined}
        />
      )}

      {game.boardgame.scoring?.timing === "live" ? (
        <ScorePanel
          players={game.players}
          scores={scores ?? {}}
          threshold={game.winThreshold}
          allowNegative={game.boardgame.scoring.allowNegative ?? false}
          minScore={game.boardgame.scoring.minScore ?? 0}
          onSet={setPlayerScore}
          disabled={busy}
          open={scoreOpen}
          onOpenChange={setScoreOpen}
        />
      ) : null}

      {canEnd ? endControl : null}

      {endOpen && scores ? (
        <LiveEndPrompt
          players={namedPlayers}
          scores={scores}
          defaultWinnerIds={liveOutcome.winners}
          tieBreak={tieBreakRecord(liveOutcome)}
          onEnd={winnerIds => {
            setEndOpen(false);
            // Persist every player's live score, not just the winner's, so no
            // one is left unscored in the finished game.
            handleEnd(
              winnerIds,
              game.players.map(p => ({
                playerId: p.playerId,
                score: scores[p.playerId] ?? 0,
              })),
              tieBreakRecord(liveOutcome),
            );
          }}
          onCancel={() => setEndOpen(false)}
          disabled={busy}
        />
      ) : null}
    </div>
  );
}

const RING_SIZE = 240;
const RING_STROKE = 14;

/** Neutral "on hold" colour (violet-500) the ring/readout adopt while paused. */
const PAUSE_COLOR = "#8b5cf6";

/** Formats a seconds count as raw seconds under a minute, else m:ss. */
function formatClock(totalS: number): string {
  if (totalS >= 60) {
    const minutes = Math.floor(totalS / 60);
    const seconds = totalS % 60;

    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  return String(totalS);
}

/**
 * The big ring readout. Under a minute we show raw seconds; from a minute up we
 * switch to m:ss so long turns (e.g. "3:00") stay readable instead of "180".
 * Once the turn runs out the readout flips to a count-up of the overtime taken
 * (prefixed with "+").
 */
function formatCountdown(remainingS: number): { value: string; label: string } {
  if (remainingS < 0) {
    return { value: `+${formatClock(-remainingS)}`, label: "dépassement" };
  }

  if (remainingS === 0) {
    return { value: "0", label: "temps écoulé" };
  }

  return {
    value: formatClock(remainingS),
    label:
      remainingS >= 60
        ? remainingS >= 120
          ? "minutes"
          : "minute"
        : "secondes",
  };
}

function TimerRing({
  remainingS,
  durationS,
  running,
  onToggle,
  size = RING_SIZE,
}: Readonly<{
  remainingS: number;
  durationS: number;
  running: boolean;
  onToggle: () => void;
  /** Outer diameter in px; smaller when the dice bar shares the screen. */
  size?: number;
}>) {
  const r = (size - RING_STROKE) / 2;
  const c = 2 * Math.PI * r;
  const paused = !running;
  const overtime = remainingS < 0;
  // Running past zero → alarm: fill the ring and pulse it red (paused overtime
  // stays the neutral hold colour instead).
  const alarming = overtime && !paused;
  const ringColor = paused
    ? PAUSE_COLOR
    : countdownColor(remainingS, durationS);
  const progress = overtime
    ? 1
    : Math.max(0, Math.min(1, remainingS / durationS));
  const display = formatCountdown(remainingS);

  // A beep on each of the last 10 seconds, then the ring at 0 (real sounds
  // ported from board-nest). Paused → silent (the effect bails on !running).
  const beepedAt = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (!running) {
      return;
    }

    if (remainingS >= 1 && remainingS <= 10) {
      playSound(BEEP_URL, 0.6, beepedAt.current, remainingS);
    }

    if (remainingS === 0) {
      playSound(RING_URL, 1, beepedAt.current, 0);
    }

    if (remainingS > 10) {
      beepedAt.current.clear();
    }
  }, [remainingS, running]);

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={running ? "Mettre en pause" : "Reprendre"}
      className="relative"
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <title>Chronomètre du tour</title>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={RING_STROKE}
          className="text-black/10 dark:text-white/10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={ringColor}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className={alarming ? "animate-overtime-ring" : undefined}
          style={{
            transition: "stroke-dashoffset 0.3s linear, stroke 0.2s ease",
          }}
        />
      </svg>

      {/* Big pause glyph fading in behind the readout while on hold. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-200"
        style={{ opacity: paused ? 0.25 : 0 }}
      >
        <svg
          width={size * 0.7}
          height={size * 0.7}
          viewBox="0 0 24 24"
          fill={PAUSE_COLOR}
          aria-hidden
        >
          <title>Pause</title>
          <rect x="6" y="5" width="4" height="14" rx="1.5" />
          <rect x="14" y="5" width="4" height="14" rx="1.5" />
        </svg>
      </span>

      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={`text-5xl font-bold tabular-nums ${
            alarming ? "animate-overtime-text" : ""
          }`}
          style={
            alarming
              ? undefined
              : { color: ringColor, transition: "color 0.2s ease" }
          }
        >
          {display.value}
        </span>
        <span className="text-xs uppercase tracking-wide text-zinc-400">
          {display.label}
        </span>
        {paused ? (
          <span className="mt-1 text-xs font-semibold text-zinc-500">
            EN PAUSE
          </span>
        ) : null}
      </span>
    </button>
  );
}

function DurationEditor({
  durationS,
  onChange,
  onPause,
}: Readonly<{
  durationS: number;
  onChange: (seconds: number) => void;
  onPause: () => void;
}>) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(durationS.toString());

  function start() {
    onPause(); // editing pauses the turn, as in board-nest
    setValue(durationS.toString());
    setOpen(true);
  }

  function apply() {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) {
      onChange(Math.round(n));
    }
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={start}
        className="text-sm text-zinc-500 underline-offset-2 hover:underline"
      >
        Durée du tour : {durationS}s — modifier
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={1}
        value={value}
        onChange={e => setValue(e.target.value)}
        aria-label="Durée du tour en secondes"
        className="w-24 rounded-lg border border-black/15 bg-white px-3 py-2 outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900"
      />
      <button
        type="button"
        onClick={apply}
        className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
      >
        OK
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15"
      >
        Annuler
      </button>
    </div>
  );
}

function WinnerPicker({
  players,
  onPick,
  disabled,
  open,
  onOpenChange,
}: Readonly<{
  players: { id: PlayerId; name: string }[];
  onPick: (ids: PlayerId[]) => void;
  disabled: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>) {
  const [picked, setPicked] = useState<PlayerId[]>([]);

  const toggle = (id: PlayerId) => {
    setPicked(ids =>
      ids.includes(id) ? ids.filter(w => w !== id) : [...ids, id],
    );
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-300"
      >
        Terminer la partie
      </button>
    );
  }

  return (
    <div className="flex w-full max-w-xs flex-col gap-2 rounded-xl border border-black/10 p-4 dark:border-white/10">
      <p className="text-sm font-semibold">Qui a gagné ?</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Plusieurs noms = victoire partagée.
      </p>
      {players.map(p => {
        const isWinner = picked.includes(p.id);

        return (
          <button
            key={p.id}
            type="button"
            disabled={disabled}
            onClick={() => toggle(p.id)}
            className={`rounded-lg border px-3 py-2 text-left transition disabled:opacity-60 ${
              isWinner
                ? "border-amber-500 bg-amber-500/10 font-semibold"
                : "border-black/10 hover:border-indigo-400 dark:border-white/10"
            }`}
          >
            {isWinner ? "🏆 " : ""}
            {p.name}
          </button>
        );
      })}
      <button
        type="button"
        disabled={disabled || picked.length === 0}
        onClick={() => onPick(picked)}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
      >
        Terminer
      </button>
      <button
        type="button"
        onClick={() => onOpenChange(false)}
        className="text-xs text-zinc-500 hover:underline"
      >
        Annuler
      </button>
    </div>
  );
}

/**
 * End-of-game control for a cooperative game: no individual winner, just a
 * shared outcome — the whole table wins together or loses together. Once
 * opened, it offers a common victory or a defeat (both end the game via
 * `onEnd`), or cancels back to the play screen.
 */
function CoopEnd({
  open,
  onOpenChange,
  onEnd,
  disabled,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnd: (won: boolean) => void;
  disabled: boolean;
}>) {
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-300"
      >
        Terminer la partie
      </button>
    );
  }

  return (
    <div className="flex w-full max-w-xs flex-col gap-2 rounded-xl border border-black/10 p-4 dark:border-white/10">
      <p className="text-sm font-semibold">Résultat de la partie</p>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onEnd(true)}
        className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-60"
      >
        🎉 Victoire commune
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onEnd(false)}
        className="rounded-lg border border-black/10 px-3 py-2 text-sm transition hover:border-rose-400 disabled:opacity-60 dark:border-white/10"
      >
        😔 Défaite
      </button>
      <button
        type="button"
        onClick={() => onOpenChange(false)}
        className="text-xs text-zinc-500 hover:underline"
      >
        Annuler
      </button>
    </div>
  );
}

/**
 * Opens the end-of-game scoresheet — whichever of the two the game uses. Same
 * button either way: from the table's point of view it is the one moment where
 * the points get counted.
 */
function CountPointsButton({
  onClick,
  disabled,
}: Readonly<{
  onClick: () => void;
  disabled: boolean;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-300 disabled:opacity-60"
    >
      Compter les points
    </button>
  );
}

/**
 * End-of-game score entry for a game scored at the end (final total). Each
 * player gets a number; the leader (by the win condition's direction) is
 * proposed as winner — several of them while the table is level, which the
 * tie-break prompt settles afterwards. Tapping a name names that player winner
 * outright (house rules). Ends once every score is in.
 */
function ScoreEntry({
  players,
  winCondition,
  onEnd,
  disabled,
  open,
  onOpenChange,
}: Readonly<{
  players: { id: PlayerId; name: string }[];
  winCondition: WinCondition;
  onEnd: (
    scores: Array<{ playerId: PlayerId; score: number }>,
    override: PlayerId | null,
  ) => void;
  disabled: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>) {
  const [raw, setRaw] = useState<Record<string, string>>({});
  const [override, setOverride] = useState<PlayerId | null>(null);

  const entries = players.map(p => {
    const text = raw[p.id]?.trim() ?? "";
    const n = Number(text);

    return {
      playerId: p.id,
      score: text !== "" && Number.isFinite(n) ? n : null,
    };
  });
  const allEntered = entries.every(e => e.score !== null);
  // While a score is missing the leader can't be trusted, so highlight nobody —
  // and level leaders are left uncrowned too, so the form doesn't give the ex
  // æquo away before the reveal reaches the place they share.
  const leader = allEntered
    ? loneLeader(
        entries.map(e => ({ playerId: e.playerId, score: e.score ?? 0 })),
        winnerDirection(winCondition),
      )
    : null;
  const highlighted = override ?? leader;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-300"
      >
        Terminer la partie
      </button>
    );
  }

  return (
    <div className="flex w-full max-w-xs flex-col gap-2 rounded-xl border border-black/10 p-4 dark:border-white/10">
      <p className="text-sm font-semibold">Scores de fin</p>
      {players.map(p => {
        const isWinner = highlighted === p.id;

        return (
          <div key={p.id} className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setOverride(p.id)}
              className={`min-w-0 flex-1 truncate text-left text-sm ${
                isWinner
                  ? "font-semibold text-amber-600 dark:text-amber-500"
                  : ""
              }`}
            >
              {isWinner ? "🏆 " : ""}
              {p.name}
            </button>
            <input
              type="number"
              inputMode="numeric"
              value={raw[p.id] ?? ""}
              onChange={e => setRaw(s => ({ ...s, [p.id]: e.target.value }))}
              aria-label={`Score de ${p.name}`}
              className="w-20 rounded-lg border border-black/15 bg-white px-2 py-1 text-right outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900"
            />
          </div>
        );
      })}
      <button
        type="button"
        disabled={disabled || !allEntered}
        onClick={() => {
          onEnd(
            entries.map(e => ({ playerId: e.playerId, score: e.score ?? 0 })),
            override,
          );
        }}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
      >
        Terminer
      </button>
      <button
        type="button"
        onClick={() => onOpenChange(false)}
        className="text-xs text-zinc-500 hover:underline"
      >
        Annuler
      </button>
    </div>
  );
}

// A single shared AudioContext, reused for every beep. Mobile browsers cap the
// number of AudioContexts (iOS allows only a handful) and suspend any created
// outside a user gesture — so creating one per beep (the previous approach)
// silently stopped firing after the first second or two on phones. We keep one
// and resume it on interaction instead.
let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) {
    return null;
  }
  if (!sharedCtx) {
    try {
      sharedCtx = new Ctor();
    } catch {
      return null;
    }
  }

  return sharedCtx;
}

/**
 * Resumes the shared AudioContext. Must be called from within a user gesture to
 * unlock audio on mobile (browsers start the context suspended otherwise).
 */
function unlockAudio() {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }
  if (ctx.state === "suspended") {
    ctx.resume();
  }
  // iOS won't unlock the audio output on resume() alone — it needs an actual
  // (silent) sound started from within the user gesture. Kick a 1-sample buffer.
  try {
    const src = ctx.createBufferSource();
    src.buffer = ctx.createBuffer(1, 1, 22050);
    src.connect(ctx.destination);
    src.start(0);
  } catch {
    // best-effort
  }
}

const BEEP_URL = "/sounds/beep.mp3";
const RING_URL = "/sounds/ring.mp3";
const soundCache = new Map<string, AudioBuffer>();

/** Fetches + decodes a sound into the shared context, cached. */
async function loadSound(url: string): Promise<void> {
  if (soundCache.has(url)) {
    return;
  }
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }
  try {
    const bytes = await fetch(url).then(r => r.arrayBuffer());
    soundCache.set(url, await ctx.decodeAudioData(bytes));
  } catch {
    // Audio is best-effort; ignore load/decode failures.
  }
}

/** Plays a decoded sound on the shared context; deduped per `key`. */
function playSound(
  url: string,
  volume: number,
  fired: Set<number>,
  key: number,
) {
  if (fired.has(key)) {
    return;
  }
  fired.add(key);

  const ctx = getAudioContext();
  const buffer = soundCache.get(url);
  if (!ctx || !buffer) {
    return;
  }
  if (ctx.state === "suspended") {
    ctx.resume();
  }

  try {
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = buffer;
    gain.gain.value = volume;
    src.connect(gain).connect(ctx.destination);
    src.start(0);
    src.onended = () => {
      src.disconnect();
      gain.disconnect();
    };
  } catch {
    // Audio is best-effort; ignore unsupported environments.
  }
}
