"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ErrorText } from "@/components/ErrorText";
import type { PlayerId, PopulatedGame } from "@/lib/domain";
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
import { NextTurnControl } from "./NextTurnControl";
import { namedPlayers } from "./named-players";
import { PlayBlock } from "./PlayBlock";
import { PlayStats } from "./PlayStats";
import { TimeHogBanner } from "./TimeHogBanner";
import { useDiceLog } from "./use-dice-log";
import { useEndFlow } from "./use-end-flow";
import { useLiveScores } from "./use-live-scores";
import { useMilestones } from "./use-milestones";
import type { PlayGame } from "./use-play-game";
import { usePlaySounds } from "./use-play-sounds";

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

  usePlaySounds();

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

  // Fixed-length games (e.g. Cascadia's 20 rounds) end on the last seat of the
  // last round: no more turns, and the scoring UI takes over. Open-ended games
  // keep their end controls available throughout.
  const roundLimit = game.boardgame.roundLimit;
  const perRound = turnsPerRound(game.boardgame.turnMode, game.players.length);
  const atFinalTurn = isFinalTurn(game.turn, perRound, roundLimit);
  const canEnd = roundLimit === null || atFinalTurn;

  // Terraforming Mars is played in generations: the progress label counts them
  // instead of laps, and whoever is up may step out of the one being played.
  const stages = game.boardgame.stages;
  const generations = stages !== null;
  const stageLabel = stages?.label ?? "Tour";

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
          generations,
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
        {progressLabel(
          stageLabel,
          generations ? game.stage : game.round,
          roundLimit,
        )}
      </p>

      {/* The whole play block (who's up / countdown / dice) gives way to the
          score form once you end the game. */}
      {entryOpen ? null : (
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

      {entryOpen ? null : (
        <NextTurnControl
          atFinalTurn={atFinalTurn}
          disabled={play.busy}
          onNext={handleNext}
          onPass={generations ? pass : null}
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

/**
 * How far along the game is — a lap count for most games ("Tour 3 / 20"), the
 * generation for the games that play in them ("Génération 2").
 */
function progressLabel(
  label: string,
  value: number,
  limit: number | null,
): string {
  return limit === null ? `${label} ${value}` : `${label} ${value} / ${limit}`;
}
