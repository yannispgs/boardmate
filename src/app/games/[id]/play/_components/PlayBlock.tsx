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
 * One of the two clocks a phase can run, laid in the grid's only cell.
 *
 * Both layers are mounted at all times and only their opacity changes. That is
 * what makes the swap smooth, and it is not a detail: the countdown carries a
 * duration editor the stopwatch has no use for, so the two are not the same
 * height. Mounting one at a time meant the row resized as they traded places
 * and the whole page slid under the table's thumb — the fade was never the
 * problem, the reflow was. Kept mounted, the row is always as tall as the
 * taller of them and nothing below it ever moves.
 *
 * The hidden layer is inert: `invisible` leaves the room it occupies untouched
 * but takes it out of the page's reach, which matters because a layer at zero
 * opacity still takes the taps aimed at what is now behind it — and both clocks
 * carry a pause button, sat one on top of the other.
 */
function ClockLayer({
  show,
  children,
}: Readonly<{ show: boolean; children: React.ReactNode }>) {
  return (
    <div
      className={`clock-layer [grid-area:1/1] flex w-full flex-col items-center gap-8 ${
        show ? "opacity-100" : "invisible opacity-0"
      }`}
    >
      {children}
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
  /** A game that also shows a dice histogram gives the clock less room. */
  const size = spec ? 168 : undefined;
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
          stopwatch, or either to nothing at all. The two cross in the same grid
          cell rather than one leaving before the other arrives: for the length
          of a fade there would otherwise be no clock at all, and a hole where a
          disc was reads as a glitch, not as a change.

          The figures have already switched by the time this runs. The clock
          belongs to the data — the per-phase time statistics are read off it —
          so the fade is told about the change, never asked to make it.

          Full width and the play screen's own gap, so wrapping them together
          changes what they look like in no way at all. */}
      <div className="grid w-full">
        <ClockLayer show={countdown}>
          <TimerRing
            remainingS={durationS - timer.elapsedS}
            durationS={durationS}
            running={timer.running}
            onToggle={timer.toggle}
            size={size}
          />

          <ClockControls
            countdown
            durationS={durationS}
            onDuration={onDuration}
            timer={timer}
          />
        </ClockLayer>

        {/* A phase that declares no clock at all shows neither, and has nothing
            to set by hand either — but the layers stay, so the room they take is
            the room they took. */}
        <ClockLayer show={!countdown && !untimed}>
          <PhaseStopwatch
            elapsedS={timer.elapsedS}
            running={timer.running}
            onToggle={timer.toggle}
            label={phase?.label ?? ""}
            size={size}
          />

          <ClockControls
            countdown={false}
            durationS={durationS}
            onDuration={onDuration}
            timer={timer}
          />
        </ClockLayer>
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
