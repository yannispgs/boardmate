"use client";

import type { PlayerId, PopulatedGame } from "@/lib/domain";
import { diceStats, diceValues } from "@/lib/game/dice";
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
  // In a game played in generations, whoever has passed is out until the next
  // one: the ribbon drops him and keeps turning between the others.
  const generations = game.boardgame.stages !== null;
  const stillIn = generations ? playersStillIn(game) : players;

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
          players={stillIn}
          currentPlayerId={game.currentPlayerId}
          round={game.round}
          roundLimit={game.boardgame.roundLimit}
          futureBlocks={!generations}
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

/**
 * The players still taking turns in the generation being played, in seat order.
 * A pass only lasts one generation, so it is read from the passes filed under
 * the current one.
 */
function playersStillIn(game: PopulatedGame) {
  const passed = new Set(
    game.stagePasses.filter(p => p.stage === game.stage).map(p => p.playerId),
  );

  return game.players.filter(p => !passed.has(p.playerId)).map(p => p.player);
}
