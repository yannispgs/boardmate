"use client";

import type { PlayerId, PopulatedGame } from "@/lib/domain";
import { diceStats, diceValues } from "@/lib/game/dice";
import { playCalendar } from "@/lib/game/stage";
import type { UseTurnTimer } from "@/lib/hooks/use-turn-timer";
import { DiceBar } from "./DiceBar";
import { DurationEditor } from "./DurationEditor";
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
}: Readonly<{
  game: PopulatedGame;
  timer: UseTurnTimer;
  durationS: number;
  onDuration: (seconds: number) => void;
  /** Simultaneous games: the player the table is waiting on this round. */
  blockedById: PlayerId | null;
  onPickBlocked: (id: PlayerId | null) => void;
  dice: DiceLog;
}>) {
  const players = game.players.map(p => p.player);
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

  return (
    <>
      {game.boardgame.turnMode === "simultaneous" ? (
        // A simultaneous round is one shared turn, so nobody is "up": the table
        // instead flags whoever it is waiting on.
        <WaitPicker
          players={players}
          value={blockedById}
          onChange={onPickBlocked}
        />
      ) : (
        <TurnFlow
          players={players}
          currentPlayerId={game.currentPlayerId}
          turn={game.turn}
          roundLimit={calendar.roundLimit}
          generation={generation}
          calendar={schedule}
        />
      )}

      <TimerRing
        remainingS={durationS - timer.elapsedS}
        durationS={durationS}
        running={timer.running}
        onToggle={timer.toggle}
        size={spec ? 168 : undefined}
      />

      <DurationEditor
        durationS={durationS}
        onChange={onDuration}
        onPause={timer.pause}
      />

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
