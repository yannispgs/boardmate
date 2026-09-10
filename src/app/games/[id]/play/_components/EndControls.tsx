"use client";

import { useState } from "react";
import type {
  MilestoneClaim,
  PlayerId,
  PopulatedGame,
  ScoringSpec,
  StageScore,
} from "@/lib/domain";
import { milestonePrefill } from "@/lib/game/milestones";
import { derivedKeys, mergePrefill, winnerDirection } from "@/lib/game/scoring";
import { stageGoalPrefill } from "@/lib/game/stage";
import { stageFinalScores } from "@/lib/game/stage-tally";
import { loneLeader } from "@/lib/game/tie-break";
import { completingScore, totalSumError } from "@/lib/game/total-sum";
import { toggled } from "@/lib/ui/selection";
import { CategoryScoreEntry } from "../../../_components/CategoryScoreEntry";
import { PairScoreEntry } from "../../../_components/PairScoreEntry";
import { namedPlayers } from "./named-players";
import type { EndFlowState } from "./use-end-flow";

/**
 * How the game ends depends on how it is scored: a shared outcome for a
 * cooperative game, one of the two end-of-game sheets, a plain final total, or
 * — when nothing is scored at all — a winner named by the table.
 */
export function EndControls({
  game,
  flow,
  milestoneClaims,
  stageScores,
  disabled,
}: Readonly<{
  game: PopulatedGame;
  flow: EndFlowState;
  /**
   * The milestones taken during play, as the panel currently holds them — not
   * as they were loaded, since nothing reloads the game between a claim and the
   * moment the points are counted.
   */
  milestoneClaims: MilestoneClaim[];
  /**
   * The manche goals scored so far, likewise held live: the last manche is
   * entered on the very turn the game ends, with no reload in between.
   */
  stageScores: StageScore[];
  disabled: boolean;
}>) {
  const players = namedPlayers(game);
  const scoring = game.boardgame.scoring;
  const finalScoring = scoring?.timing === "final" ? scoring : null;
  const milestones = game.boardgame.milestones;

  // Cooperative games end on a shared outcome, not by picking a winner.
  if (game.boardgame.kind === "cooperative") {
    return (
      <CoopEnd
        open={flow.entryOpen}
        onOpenChange={flow.setEntryOpen}
        onEnd={flow.endCoop}
        disabled={disabled}
      />
    );
  }

  if (finalScoring?.entry === "pairs") {
    return (
      <>
        <CountPointsButton
          onClick={() => flow.setEntryOpen(true)}
          disabled={disabled}
        />
        {flow.entryOpen ? (
          <PairScoreEntry
            seats={players}
            onSubmit={flow.finishPairs}
            onCancel={() => flow.setEntryOpen(false)}
            disabled={disabled}
          />
        ) : null}
      </>
    );
  }

  if (finalScoring?.entry === "categories" && finalScoring.sheet) {
    return (
      <>
        <CountPointsButton
          onClick={() => flow.setEntryOpen(true)}
          disabled={disabled}
        />
        {flow.entryOpen ? (
          <CategoryScoreEntry
            players={players}
            sheet={finalScoring.sheet}
            initial={mergePrefill([
              milestones === null
                ? {}
                : milestonePrefill(milestones, milestoneClaims),
              stageGoalPrefill(
                finalScoring.sheet,
                players.map(p => p.id),
                stageScores,
              ),
            ])}
            readOnlyKeys={derivedKeys(finalScoring.sheet, "stageGoals")}
            onSubmit={flow.finishCategories}
            onCancel={() => flow.setEntryOpen(false)}
            disabled={disabled}
          />
        ) : null}
      </>
    );
  }

  // A game counted manche by manche has already been scored, manche after
  // manche: asking for a total at the end would ask the table to add up what
  // the app is holding. It ends on those sums, and on nothing else.
  if (finalScoring && game.boardgame.stages?.advance === "manual") {
    return (
      <EndGameButton
        onClick={() =>
          void flow.finishTotals(
            stageFinalScores(
              players.map(p => p.id),
              stageScores,
            ),
            null,
          )
        }
      />
    );
  }

  if (finalScoring) {
    return (
      <ScoreEntry
        players={players}
        scoring={finalScoring}
        onEnd={flow.finishTypedTotals}
        disabled={disabled}
        open={flow.entryOpen}
        onOpenChange={flow.setEntryOpen}
      />
    );
  }

  return (
    <WinnerPicker
      players={players}
      onPick={flow.endByHand}
      disabled={disabled}
      open={flow.entryOpen}
      onOpenChange={flow.setEntryOpen}
    />
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
    setPicked(ids => toggled(ids, id));
  };

  if (!open) {
    return <EndGameButton onClick={() => onOpenChange(true)} />;
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
      <CancelLink onClick={() => onOpenChange(false)} />
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
    return <EndGameButton onClick={() => onOpenChange(true)} />;
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
      <CancelLink onClick={() => onOpenChange(false)} />
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
 * outright (house rules). Ends once every score is in, and — for a game whose
 * points are one pile shared out (Papayoo) — once they add up to it.
 *
 * Dealing the next party is offered afterwards, on the finished party's own
 * screen: it used to be a second button here, which only the games scored this
 * way could ever have.
 */
function ScoreEntry({
  players,
  scoring,
  onEnd,
  disabled,
  open,
  onOpenChange,
}: Readonly<{
  players: { id: PlayerId; name: string }[];
  scoring: ScoringSpec;
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

  const typed = players.map(p => {
    const text = raw[p.id] ?? "";
    const n = Number(text.trim());

    return {
      player: p,
      text,
      score: text.trim() !== "" && Number.isFinite(n) ? n : null,
    };
  });
  // The last score of a shared pile is a subtraction, not a count — so the form
  // does it. `null` in every other case, which makes filling the box in a plain
  // fallback rather than a special path.
  const completing = completingScore(typed, scoring);
  const fields = typed.map(field => {
    const score = field.score ?? completing;

    return {
      ...field,
      score,
      // Shown as though it had been typed: the sheet has to read as a whole
      // before it is recorded. It is a proposal — typing over it replaces it,
      // and emptying the box brings it back.
      text: field.score === null && score !== null ? String(score) : field.text,
    };
  });
  const entries = fields.map(f => ({ playerId: f.player.id, score: f.score }));
  const allEntered = entries.every(e => e.score !== null);
  const refused = totalSumError(entries, scoring);
  // While a score is missing the leader can't be trusted, so highlight nobody —
  // and level leaders are left uncrowned too, so the form doesn't give the ex
  // æquo away before the reveal reaches the place they share.
  const leader = allEntered
    ? loneLeader(
        entries.map(e => ({ playerId: e.playerId, score: e.score ?? 0 })),
        winnerDirection(scoring.winCondition),
      )
    : null;
  const highlighted = override ?? leader;
  const blocked = disabled || !allEntered || refused !== null;

  /** Hands the party in, on the scores as the form finally reads them. */
  function finish() {
    onEnd(
      entries.map(e => ({ playerId: e.playerId, score: e.score ?? 0 })),
      override,
    );
  }

  if (!open) {
    // Nothing ends here yet: this button opens a sheet the table still has to
    // fill in. Naming it after the ending made it look like the last tap.
    return (
      <EndGameButton
        label="Entrer les scores"
        onClick={() => onOpenChange(true)}
      />
    );
  }

  return (
    <div className="flex w-full max-w-xs flex-col gap-2 rounded-xl border border-black/10 p-4 dark:border-white/10">
      <p className="text-sm font-semibold">Scores de fin</p>
      {fields.map(({ player: p, text }) => {
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
              value={text}
              onChange={e => setRaw(s => ({ ...s, [p.id]: e.target.value }))}
              aria-label={`Score de ${p.name}`}
              className="w-20 rounded-lg border border-black/15 bg-white px-2 py-1 text-right outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900"
            />
          </div>
        );
      })}
      {refused === null ? null : (
        <p className="text-xs text-rose-600 dark:text-rose-400">{refused}</p>
      )}
      <button
        type="button"
        disabled={blocked}
        onClick={finish}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
      >
        Terminer
      </button>
      <CancelLink onClick={() => onOpenChange(false)} />
    </div>
  );
}

/**
 * The closed state every end control shares: one button that opens it. It says
 * what the tap actually does, which is not always ending the game — a sheet to
 * fill in first deserves to say so.
 */
function EndGameButton({
  onClick,
  label = "Terminer la partie",
}: Readonly<{ onClick: () => void; label?: string }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-300"
    >
      {label}
    </button>
  );
}

function CancelLink({ onClick }: Readonly<{ onClick: () => void }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs text-zinc-500 hover:underline"
    >
      Annuler
    </button>
  );
}
