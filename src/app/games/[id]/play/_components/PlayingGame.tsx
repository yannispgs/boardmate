"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ErrorText } from "@/components/ErrorText";
import type { PlayerId, PopulatedGame } from "@/lib/domain";
import { composeGoals } from "@/lib/game/extensions";
import { gameProgress, playProgress } from "@/lib/game/game-progress";
import { winnerDirection } from "@/lib/game/scoring";
import {
  isLastTurnOfStage,
  playCalendar,
  stageGoalLabel,
  stageScores,
} from "@/lib/game/stage";
import { isFinalTurn, turnsPerRound } from "@/lib/game/turn";
import { turnDurationForRound } from "@/lib/game/turn-schedule";
import { useTurnTimer } from "@/lib/hooks/use-turn-timer";
import { useWakeLock } from "@/lib/hooks/use-wake-lock";
import { getGameRepository } from "@/lib/repositories";
import { EndControls } from "./EndControls";
import { EndFlow } from "./EndFlow";
import { FaqPanel } from "./FaqPanel";
import { LiveScoreSection } from "./LiveScoreSection";
import { MilestonePanel } from "./MilestonePanel";
import { namedPlayers } from "./named-players";
import { PlayBlock } from "./PlayBlock";
import { PlayStats } from "./PlayStats";
import { SeatOrderPanel } from "./SeatOrderPanel";
import { StageBoard } from "./StageBoard";
import { TimeHogBanner } from "./TimeHogBanner";
import { TurnControls } from "./TurnControls";
import { useDiceLog } from "./use-dice-log";
import { useEndFlow } from "./use-end-flow";
import { useLiveScores } from "./use-live-scores";
import { useMilestones } from "./use-milestones";
import type { PlayGame } from "./use-play-game";
import { usePlaySounds } from "./use-play-sounds";
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
  const flow = useEndFlow(game, play);
  const live = useLiveScores(game, play);
  const dice = useDiceLog(game, play);
  const milestones = useMilestones(game);
  const goals = useStageGoals(game);

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

  // Keep the screen awake while a turn is actively running; let it sleep on
  // pause / once the game ends, to spare the battery.
  useWakeLock(game.status === "ongoing" && timer.running);

  // The manual duration is a one-turn tweak: the next turn follows the schedule
  // again. Adjusted while rendering rather than in an effect, so the new turn's
  // countdown is right on its first paint.
  const [tweakedTurn, setTweakedTurn] = useState(game.turn);

  if (tweakedTurn !== game.turn) {
    setTweakedTurn(game.turn);
    setDurationOverride(null);
  }

  // The end score form replaces the timer once opened; pause the timer then so
  // it doesn't keep ticking (and running down the wake lock) behind the form.
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
  const scoring = game.boardgame.scoring;
  const direction = scoring ? winnerDirection(scoring.winCondition) : "highest";
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

      <p className="text-sm uppercase tracking-wide text-zinc-400">
        {playProgress(game, stages, game.stages, roundLimit)}
      </p>

      {/* The whole play block (who's up / countdown / dice) gives way to the
          score form once you end the game — and never shows at all for a game
          that times nothing. */}
      {entryOpen || byHand ? null : (
        <PlayBlock
          game={game}
          timer={timer}
          durationS={durationS}
          onDuration={setDurationOverride}
          blockedById={blockedById}
          onPickBlocked={pickBlocked}
          dice={dice}
        />
      )}

      <ErrorText message={play.error} />
      <ErrorText message={goals.error} />

      {entryOpen ? null : byHand ? (
        <StageBoard
          game={game}
          goals={goals}
          stageLabel={stageLabel}
          direction={direction}
          disabled={play.busy || goals.busy}
          onNextStage={nextStage}
          onEnd={scores => flow.finishTotals(scores, null)}
        />
      ) : (
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
      )}

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
        turnMode={game.boardgame.turnMode}
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
