"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ErrorText } from "@/components/ErrorText";
import type { PhaseSpec, PlayerId, PopulatedGame } from "@/lib/domain";
import { chainedGame } from "@/lib/game/chained-game";
import { composeGoals } from "@/lib/game/extensions";
import { gameProgress, playProgress } from "@/lib/game/game-progress";
import {
  advancePhase,
  currentPhase,
  draftDirection,
  needsPhaseButton,
  nextPhase,
} from "@/lib/game/phase";
import { scoreDirectionOf } from "@/lib/game/scoring";
import {
  isLastTurnOfStage,
  playCalendar,
  stageGoalLabel,
  stageScores,
} from "@/lib/game/stage";
import { isFinalTurn, turnsPerRound } from "@/lib/game/turn";
import { turnDurationForRound } from "@/lib/game/turn-schedule";
import { useOverlaysOpen } from "@/lib/hooks/use-overlays-open";
import { useTurnTimer } from "@/lib/hooks/use-turn-timer";
import { useWakeLock } from "@/lib/hooks/use-wake-lock";
import { getGameRepository } from "@/lib/repositories";
import { DimVeil } from "./DimVeil";
import { EndControls } from "./EndControls";
import { EndFlow } from "./EndFlow";
import { FaqPanel } from "./FaqPanel";
import { GameTieBreak } from "./GameTieBreak";
import { LastLapBanner } from "./LastLapBanner";
import { LiveScoreSection } from "./LiveScoreSection";
import { MilestonePanel } from "./MilestonePanel";
import { namedPlayers } from "./named-players";
import { PartyRank } from "./PartyRank";
import { PhaseBar } from "./PhaseBar";
import { PhaseControls } from "./PhaseControls";
import { PlayBlock } from "./PlayBlock";
import { PlayStats } from "./PlayStats";
import { SeatOrderPanel } from "./SeatOrderPanel";
import { SessionFacts } from "./SessionFacts";
import { SessionStats } from "./SessionStats";
import { StageBoard } from "./StageBoard";
import { TimeHogBanner } from "./TimeHogBanner";
import { TurnControls } from "./TurnControls";
import { useDiceLog } from "./use-dice-log";
import { useDimVeil } from "./use-dim-veil";
import { useEndFlow } from "./use-end-flow";
import { useLiveScores } from "./use-live-scores";
import { useMilestones } from "./use-milestones";
import type { PlayGame } from "./use-play-game";
import { usePlaySounds } from "./use-play-sounds";
import { useSessionGames } from "./use-session-games";
import { useStageGoals } from "./use-stage-goals";

/**
 * A game in progress. Takes the loaded game, so nothing below has to wonder
 * whether there is one: it drives the turn (who is up, the countdown, the dice)
 * and hands over to the end-of-game flow when the table stops playing.
 */
export function PlayingGame({
  game,
  play,
}: Readonly<{ game: PopulatedGame; play: PlayGame }>) {
  const router = useRouter();
  const repo = getGameRepository();
  const timer = useTurnTimer();

  /**
   * Deals the same party again — same players, same seats, same config — and
   * lands on it, so an evening of short parties never goes back through the
   * « Parties » menu. Only ever reached from the games that offer it.
   */
  async function chain() {
    const next = await repo.create(chainedGame(game));

    router.push(`/games/${next.id}/play`);
  }

  const flow = useEndFlow(game, play, chain);
  const live = useLiveScores(game, play);
  const dice = useDiceLog(game, play);
  const milestones = useMilestones(game);
  const goals = useStageGoals(game);
  // The evening this party belongs to. A party played on its own is a sitting
  // of one, so this is a single-row answer far more often than not.
  const sitting = useSessionGames(game.sessionId, game.id);

  usePlaySounds();

  // Every goal tile the game can be set up with — the extensions' included, so
  // an Oceania tile still reads out by name during a game played with it.
  const catalogue = composeGoals(game.boardgame.roundGoals, game.extensions);

  // A manual duration for the current turn, overriding the schedule.
  const [durationOverride, setDurationOverride] = useState<number | null>(null);
  // Simultaneous games: the player the table is waiting on this round (tapped),
  // recorded when the round advances then cleared for the next round. The ref
  // holds when they were tapped, to time the wait (tap → advance).
  const [blockedById, setBlockedById] = useState<PlayerId | null>(null);
  const blockedAtRef = useRef<number | null>(null);

  // Keep the screen awake for the whole game, pauses included: a pause is
  // usually the table arguing over a rule or counting cards, precisely when the
  // phone must not lock. It sleeps again once the game ends or the screen is
  // left. Games without a timer are covered too, since they never "run".
  useWakeLock(game.status === "ongoing");

  // The manual duration is a one-turn tweak: the next turn follows the schedule
  // again. Adjusted while rendering rather than in an effect, so the new turn's
  // countdown is right on its first paint.
  const [tweakedTurn, setTweakedTurn] = useState(game.turn);

  if (tweakedTurn !== game.turn) {
    setTweakedTurn(game.turn);
    setDurationOverride(null);
  }

  // The end score form replaces the timer once opened; pause the timer then so
  // it doesn't keep ticking behind the form.
  const { entryOpen } = flow;
  useEffect(() => {
    if (entryOpen) {
      timer.pause();
    }
  }, [entryOpen, timer.pause]);

  const durationS = turnDuration(game, durationOverride);

  // How the game turns: in plain laps, in generations somebody steps out of, on
  // a calendar of stages laid out at launch (Wingspan's manches) — or in manches
  // the table closes itself, which have no turns to speak of (Odin).
  const stages = game.boardgame.stages;
  const generations = stages?.advance === "pass";
  const byHand = stages?.advance === "manual";
  // A game that times nothing has no play block and no turn to advance: the
  // screen is the tally board (Odin) or, with no stages either, the score sheet
  // and the button that opens it (Papayoo).
  const timed = game.boardgame.timed;

  // A stopped clock means the table is talking, not playing: the screen blacks
  // itself out so the phone stops lighting the room, and any touch brings it
  // back. A game that times nothing never pauses, and the score form stops the
  // clock on purpose — neither should go dark. Nor should a screen somebody is
  // reading: opening the FAQ or the stats pauses the clock too, and blacking
  // out over the panel that was just asked for is the opposite of helpful.
  const overlayOpen = useOverlaysOpen();
  const veil = useDimVeil(
    timed && !entryOpen && !overlayOpen && !timer.running,
  );

  const scoring = game.boardgame.scoring;
  const direction = scoreDirectionOf(scoring);
  const stageLabel = gameProgress(game, stages).label;
  const calendar = playCalendar(
    stages?.advance,
    game.stages,
    game.boardgame.roundLimit,
  );

  // Fixed-length games (e.g. Cascadia's 20 rounds) end on the last seat of the
  // last round: no more turns, and the scoring UI takes over. Open-ended games
  // keep their end controls available throughout. A game on a calendar takes
  // its length from the calendar, not from the box.
  const roundLimit = calendar.roundLimit;
  const perRound = turnsPerRound(game.boardgame.turnMode, game.players.length);
  const atFinalTurn = isFinalTurn(game.turn, perRound, roundLimit);
  const canEnd = roundLimit === null || atFinalTurn;

  // The table has just gone round for the last time this manche: the goal tile
  // is scored now, while the birds are still on the table.
  const atStageEnd =
    calendar.scheduled &&
    isLastTurnOfStage(game.turn, perRound, calendar.turnsPerStage);

  // Milestones are handed out during the game, from the left-edge panel — the
  // edge that belongs to the game on the table. Null for every game that has
  // none, which is every game but Terraforming Mars today.
  const milestoneSpec = game.boardgame.milestones;

  // A stage played in phases: which one the table is in, where it goes next,
  // and — on a drafted draw — which way the cards travel this generation. All
  // null / inert for a boardgame that declares no phases, which is every one
  // but Terraforming Mars today.
  const phases = game.boardgame.phases;
  const phase = currentPhase(phases, game.phase);
  const phaseOut = advancePhase(phases, game.phase);
  const draft =
    phase?.draft && game.drafting ? draftDirection(phase, game.stage) : null;

  function pickBlocked(id: PlayerId | null) {
    setBlockedById(id);
    blockedAtRef.current = waitStart(id);
  }

  async function handleNext(passing = false) {
    // Snapshot the finished turn's numbers, then restart the timer *immediately*
    // — the new turn's clock starts on the click, not when Supabase replies, so
    // the countdown never keeps ticking during the async persist.
    const elapsedS = timer.elapsedS;
    const pauses = timer.pauseStats();
    const overtimeS = Math.max(0, elapsedS - durationS);
    const waitedSeconds = waitedFor(blockedById, blockedAtRef.current);
    const blocked = blockedById;

    timer.reset();
    pickBlocked(null);

    await play.run("Impossible de passer au tour suivant.", async () => {
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
          advance: stages?.advance,
          passing,
          // The turns running out no longer ends the generation on a game
          // played in phases: there is still a phase after them.
          phaseOut: phases ? phaseOut : undefined,
          // …and the phase they were played in is banked with them, since no
          // button will ever close it.
          phaseKey: phase?.key,
        },
      );
      await play.reload();
    });
  }

  // Passing costs a player the rest of the generation and the app offers no way
  // back — the button it comes from has to be held down, so the deliberate press
  // is the confirmation and nothing more is asked here.
  function pass() {
    void handleNext(true);
  }

  // Opening the next manche is the whole of a by-hand game's « turn »: nothing
  // was timed and nobody was up, so there is no turn to record — only one more
  // manche to deal.
  async function nextStage() {
    await play.run("Impossible d'ouvrir la manche suivante.", async () => {
      await repo.advanceStage(game.id);
      await play.reload();
    });
  }

  /**
   * Closes a phase the table plays all at once, banking the stopwatch. The
   * clock restarts on the click, like a turn's, so the next phase is not timed
   * from whenever Supabase replies.
   */
  async function endPhase(closing: PhaseSpec) {
    const durationS = timer.elapsedS;

    timer.reset();

    await play.run("Impossible de terminer la phase.", async () => {
      await repo.endPhase(game.id, {
        stage: game.stage,
        phaseKey: closing.key,
        durationS,
        next: phaseOut,
      });
      await play.reload();
    });
  }

  /**
   * What the table acts on: the turn controls, or — for a game with no turns to
   * speak of — the manche board. Both give way to the end-of-game score form.
   */
  function controls() {
    if (entryOpen) {
      return null;
    }

    // A phase everybody plays at once has no turn to advance, so the table
    // closes the phase itself instead.
    if (phase !== null && needsPhaseButton(phase)) {
      return (
        <PhaseControls
          nextLabel={
            nextPhase(phases, game.phase)?.label ??
            `${stageLabel} ${game.stage + 1}`
          }
          disabled={play.busy}
          onEndPhase={() => void endPhase(phase)}
        />
      );
    }

    // Untimed and not counted in manches either (Papayoo): nothing happens
    // between sitting down and writing the score, so the screen offers nothing
    // but the end-of-game form below.
    if (!timed && !byHand) {
      return null;
    }

    if (byHand) {
      return (
        <StageBoard
          game={game}
          goals={goals}
          stageLabel={stageLabel}
          direction={direction}
          disabled={play.busy || goals.busy}
          onNextStage={nextStage}
          onEnd={scores => flow.finishTotals(scores, null)}
        />
      );
    }

    return (
      <TurnControls
        atFinalTurn={atFinalTurn}
        atStageEnd={atStageEnd}
        goalScores={stageScores(game.stages[game.stage - 1], catalogue)}
        stage={game.stage}
        stageLabel={stageLabel}
        goalLabel={stageGoalLabel(game.stages[game.stage - 1], catalogue)}
        players={namedPlayers(game)}
        entered={goals.entered(game.stage)}
        disabled={play.busy || goals.busy}
        onNext={handleNext}
        onPass={generations ? pass : null}
        onScoreGoal={points => goals.save(game.stage, points)}
      />
    );
  }

  // Counting the points takes over the whole screen, up to the recap.
  if (flow.outcome !== null && flow.phase !== "play") {
    return (
      <EndFlow
        game={game}
        flow={flow}
        outcome={flow.outcome}
        disabled={play.busy}
        onDone={() => router.push("/games")}
      />
    );
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <TimeHogBanner
        players={game.players}
        turns={game.turns}
        round={game.round}
      />

      <LastLapBanner shown={live.lastLap} />

      {phases === null ? null : (
        <PhaseBar phases={phases} current={game.phase} draft={draft} />
      )}

      {/* Where a timed game says which lap it is on, an evening says which deal
          it is on. The two never show together: only a game the app puts no
          clock on can be dealt again from the score sheet. */}
      <PartyRank games={sitting} gameId={game.id} />

      {/* « Tour 1 » would sit there for the whole game on a table that never
          advances a turn, so an untimed game with no manches says nothing. */}
      {!timed && !byHand ? null : (
        <p className="text-sm uppercase tracking-wide text-zinc-400">
          {playProgress(game, stages, game.stages, roundLimit)}
        </p>
      )}

      {/* The whole play block (who's up / countdown / dice) gives way to the
          score form once you end the game — and never shows at all for a game
          that times nothing. */}
      {entryOpen || !timed ? null : (
        <PlayBlock
          game={game}
          timer={timer}
          durationS={durationS}
          onDuration={setDurationOverride}
          blockedById={blockedById}
          onPickBlocked={pickBlocked}
          dice={dice}
          closingRound={live.closingRound}
          phase={phase}
        />
      )}

      <ErrorText message={play.error} />
      <ErrorText message={goals.error} />

      {controls()}

      {/* High up on purpose: on a table dealing party after party, « où on en
          est » is the whole reason to look at the phone between two deals. */}
      <SessionStats games={sitting} direction={direction} />

      {/* What the table would say out loud between two deals, under the figures
          that back it up. Silent on a short evening, and on a long one with
          nothing worth telling. */}
      <SessionFacts game={game} games={sitting} />

      <FaqPanel boardgame={game.boardgame} extensions={game.extensions} />

      {milestoneSpec === null ? null : (
        <MilestonePanel
          spec={milestoneSpec}
          gameName={game.boardgame.name}
          seats={namedPlayers(game)}
          log={milestones}
        />
      )}

      <SeatOrderPanel
        gameId={game.id}
        boardgame={game.boardgame}
        turnsPlayed={game.turns.length}
        seats={namedPlayers(game)}
        onSaved={play.reload}
      />

      <PlayStats game={game} rolls={dice.rolls} />

      <LiveScoreSection
        game={game}
        live={live}
        flow={flow}
        disabled={play.busy}
      />

      {canEnd ? (
        <EndControls
          game={game}
          flow={flow}
          milestoneClaims={milestones.claims}
          stageScores={goals.scores}
          disabled={play.busy}
        />
      ) : null}

      {/* Totals typed by the table go straight into the books, with no reveal
          to open the tie-break from: it opens over the form instead. */}
      <GameTieBreak game={game} flow={flow} disabled={play.busy} />

      {/* Last, so the veil covers everything above it — including the tie-break
          that may be open when the table stops the clock to argue. */}
      {veil.dimmed ? (
        <DimVeil elapsedS={timer.elapsedS} onLift={veil.lift} />
      ) : null}
    </div>
  );
}

/**
 * The current turn's countdown: the schedule's duration for this round, unless
 * the user manually overrode it for the turn.
 */
function turnDuration(game: PopulatedGame, override: number | null): number {
  return override ?? turnDurationForRound(game.turnSchedule, game.round);
}

/** When the wait clock starts: tapping a player starts it, untapping clears it. */
function waitStart(id: PlayerId | null): number | null {
  return id === null ? null : Date.now();
}

/** How long the table has been waiting on the player it flagged, in seconds. */
function waitedFor(blockedById: PlayerId | null, since: number | null): number {
  if (blockedById === null || since === null) {
    return 0;
  }

  return (Date.now() - since) / 1000;
}
