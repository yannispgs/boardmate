"use client";

import type { PhaseSpec, PlayerId, PopulatedGame } from "@/lib/domain";
import { diceStats, diceValues } from "@/lib/game/dice";
import { turnTimerApplies } from "@/lib/game/phase";
import { playCalendar } from "@/lib/game/stage";
import { lastRound } from "@/lib/game/stop-condition";
import type { UseTurnTimer } from "@/lib/hooks/use-turn-timer";
import { DiceBar } from "./DiceBar";
import { DurationEditor } from "./DurationEditor";
import { PhaseStopwatch } from "./PhaseStopwatch";
import { TimerAdjust } from "./TimerAdjust";
import { TimerRing } from "./TimerRing";
import { TurnFlow } from "./turn-flow";
import type { DiceLog } from "./use-dice-log";
import { WaitPicker } from "./WaitPicker";

/**
 * What the table watches while it plays: who is up, the turn's countdown, and
 * the dice histogram for the games that track their rolls.
 */
export function PlayBlock({
  game,
  timer,
  durationS,
  onDuration,
  blockedById,
  onPickBlocked,
  dice,
  closingRound,
  phase,
}: Readonly<{
  game: PopulatedGame;
  timer: UseTurnTimer;
  durationS: number;
  onDuration: (seconds: number) => void;
  /** Simultaneous games: the player the table is waiting on this round. */
  blockedById: PlayerId | null;
  onPickBlocked: (id: PlayerId | null) => void;
  dice: DiceLog;
  /** The lap a reached target is about to close the game at, if there is one. */
  closingRound: number | null;
  /** The phase being played, or null for a game that declares none. */
  phase: PhaseSpec | null;
}>) {
  const players = game.players.map(p => p.player);
  // The clock a phase runs decides what the table watches: the per-player
  // countdown it already knows, a shared stopwatch, or nothing at all. A game
  // with no phases keeps the countdown, which is every game but one.
  const countdown = turnTimerApplies(phase);
  const untimed = phase?.clock === "none";
  // Nobody is « up » in a phase everybody plays at once, so the turn ribbon has
  // nothing to point at and steps aside until the turns come back round.
  const turnless = phase?.mode === "simultaneous";
  const spec = game.boardgame.dice;
  const range = spec ? diceValues(spec) : [];
  const stages = game.boardgame.stages;
  // A game played in generations keeps every player on the ribbon: whoever has
  // passed is simply not given a turn until the next generation opens.
  const generation =
    stages?.advance === "pass"
      ? { stage: game.stage, turns: game.turns, passes: game.stagePasses }
      : null;
  // A game on a calendar is laid out in advance, stage by stage: its length and
  // the seat each turn belongs to both come from the calendar, not from the box.
  const calendar = playCalendar(
    stages?.advance,
    game.stages,
    game.boardgame.roundLimit,
  );
  const schedule =
    stages && calendar.scheduled
      ? { label: stages.label, turnsPerStage: calendar.turnsPerStage }
      : null;

  /** Who the table is on: the seat that is up, or the one it is waiting for. */
  function ribbon() {
    if (game.boardgame.turnMode === "simultaneous") {
      // A simultaneous round is one shared turn, so nobody is "up": the table
      // instead flags whoever it is waiting on.
      return (
        <WaitPicker
          players={players}
          value={blockedById}
          onChange={onPickBlocked}
        />
      );
    }

    return (
      <TurnFlow
        players={players}
        currentPlayerId={game.currentPlayerId}
        turn={game.turn}
        // A target reached brings the end forward: the ribbon then stops at
        // that lap instead of the game's own length, so the seats still to
        // play can see the finish line coming at them.
        roundLimit={lastRound(calendar.roundLimit, closingRound)}
        generation={generation}
        calendar={schedule}
      />
    );
  }

  return (
    <>
      {turnless ? null : ribbon()}

      {countdown ? (
        <TimerRing
          remainingS={durationS - timer.elapsedS}
          durationS={durationS}
          running={timer.running}
          onToggle={timer.toggle}
          size={spec ? 168 : undefined}
        />
      ) : null}

      {countdown || untimed ? null : (
        <PhaseStopwatch
          elapsedS={timer.elapsedS}
          running={timer.running}
          onToggle={timer.toggle}
          label={phase?.label ?? ""}
          size={spec ? 168 : undefined}
        />
      )}

      {/* The two ways the countdown is set by hand: how long a turn lasts, and
          where the current one actually stands. A phase timed by the table's
          stopwatch has neither — nothing was allotted to correct. */}
      {countdown ? (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <DurationEditor
            durationS={durationS}
            onChange={onDuration}
            onPause={timer.pause}
          />

          <TimerAdjust durationS={durationS} timer={timer} />
        </div>
      ) : null}

      {spec ? (
        <DiceBar
          values={range}
          stats={diceStats(dice.rolls, range)}
          lastRolled={dice.rolls.at(-1) ?? null}
          onRoll={dice.roll}
          disabled={game.status !== "ongoing"}
          capNotice={dice.capNotice}
          maxRolls={game.turn}
        />
      ) : null}
    </>
  );
}
