"use client";

import type { PhaseSpec, PlayerId, PopulatedGame } from "@/lib/domain";
import { diceStats, diceValues } from "@/lib/game/dice";
import { turnTimerApplies } from "@/lib/game/phase";
import { playCalendar } from "@/lib/game/stage";
import { lastRound } from "@/lib/game/stop-condition";
import type { UseTurnTimer } from "@/lib/hooks/use-turn-timer";
import { ClockControls } from "./ClockControls";
import { DiceBar } from "./DiceBar";
import { PhaseStopwatch } from "./PhaseStopwatch";
import { TimerRing } from "./TimerRing";
import { TurnFlow } from "./turn-flow";
import type { DiceLog } from "./use-dice-log";
import { WaitPicker } from "./WaitPicker";

/**
 * One phase's clock: the per-player countdown or the table stopwatch, and the
 * controls that set it by hand. Both the arriving and the departing phase render
 * one, stacked in the same grid cell so they can cross-fade.
 */
function ClockColumn({
  phase,
  timer,
  durationS,
  onDuration,
  compact,
  className,
}: Readonly<{
  phase: PhaseSpec | null;
  timer: UseTurnTimer;
  durationS: number;
  onDuration: (seconds: number) => void;
  /** A game that also shows a dice histogram gives the clock less room. */
  compact: boolean;
  className: string;
}>) {
  // The clock a phase runs decides what the table watches: the per-player
  // countdown it already knows, a shared stopwatch, or nothing at all. A game
  // with no phases keeps the countdown, which is every game but one.
  const countdown = turnTimerApplies(phase);
  const untimed = phase?.clock === "none";
  const size = compact ? 168 : undefined;

  return (
    // Every column sits in the first cell, so they overlap instead of stacking
    // — and the row keeps the height of the tallest, which is what stops the
    // page from jumping under the swap.
    <div
      className={`[grid-area:1/1] flex w-full flex-col items-center gap-8 ${className}`}
    >
      {countdown ? (
        <TimerRing
          remainingS={durationS - timer.elapsedS}
          durationS={durationS}
          running={timer.running}
          onToggle={timer.toggle}
          size={size}
        />
      ) : null}

      {countdown || untimed ? null : (
        <PhaseStopwatch
          elapsedS={timer.elapsedS}
          running={timer.running}
          onToggle={timer.toggle}
          label={phase?.label ?? ""}
          size={size}
        />
      )}

      {/* A phase that declares no clock at all has nothing to set by hand. */}
      {untimed ? null : (
        <ClockControls
          countdown={countdown}
          durationS={durationS}
          onDuration={onDuration}
          timer={timer}
        />
      )}
    </div>
  );
}

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
  leaving,
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
  /**
   * The phase whose clock is on its way out, while the swap lasts — null the
   * rest of the time. It is rendered over the incoming one so the two cross,
   * rather than leaving a hole where the clock was.
   */
  leaving: PhaseSpec | null;
}>) {
  const players = game.players.map(p => p.player);
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

      {/* One phase's clock gives way to the next one's — a countdown to a table
          stopwatch, or either to nothing at all. The two are laid in the SAME
          grid cell so they overlap: the outgoing one fades out while the
          incoming one fades in, over one window. Swapping them without that
          overlap left the screen empty for the length of the fade, and an empty
          hole where a clock was reads as a glitch, not as a change.

          The figures have already switched by the time this runs. The clock
          belongs to the data — the per-phase time statistics are read off it —
          so the animation is told about the change, never asked to make it.

          Full width and the play screen's own gap, so wrapping them together
          changes what they look like in no way at all. */}
      <div className="grid w-full">
        {leaving === null ? null : (
          <ClockColumn
            key={`out-${leaving.key}`}
            className="clock-out pointer-events-none"
            phase={leaving}
            timer={timer}
            durationS={durationS}
            onDuration={onDuration}
            compact={!!spec}
          />
        )}

        <ClockColumn
          key={phase?.key ?? "no-phase"}
          className="clock-in"
          phase={phase}
          timer={timer}
          durationS={durationS}
          onDuration={onDuration}
          compact={!!spec}
        />
      </div>

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
