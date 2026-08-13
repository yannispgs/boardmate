"use client";

import { useState } from "react";

import { Modal } from "@/components/Modal";
import type {
  PlayerId,
  TieBreakRecord,
  TieBreakRule,
  TieBreakStep,
} from "@/lib/domain";
import type { ScoreDirection } from "@/lib/game/scoring";
import {
  formatNames,
  recordForWinners,
  resolveTieBreak,
  tieBreakRecord,
} from "@/lib/game/tie-break";
import { toggled } from "@/lib/ui/selection";

/** One line of the recap: "Le plus de jetons nature — Alice 5, Bob 3". */
function StepLine({
  step,
  nameOf,
}: Readonly<{ step: TieBreakStep; nameOf: (id: PlayerId) => string }>) {
  const detail = Object.entries(step.values)
    .map(([id, value]) => `${nameOf(id as PlayerId)} ${value}`)
    .join(", ");

  return (
    <li>
      <span className="font-medium">{step.label}</span>
      <span className="text-zinc-500 dark:text-zinc-400"> — {detail}</span>
    </li>
  );
}

/**
 * Shown when a scored game ends with several players level on the best score.
 * It applies the boardgame's own secondary rules in order, asking the table for
 * the values the app can't know (nature tokens, leftover food…), then *proposes*
 * the outcome — down to a shared victory when no rule separates them. The
 * proposal stays modifiable: tapping a name adds or removes a winner, so the
 * table always has the last word.
 */
export function TieBreakPrompt({
  players,
  scores,
  direction,
  rules,
  currentPlayerId,
  onConfirm,
  onCancel,
  disabled,
}: Readonly<{
  players: { id: PlayerId; name: string }[];
  scores: Record<string, number>;
  direction: ScoreDirection;
  rules: TieBreakRule[];
  currentPlayerId: PlayerId | null;
  onConfirm: (winnerIds: PlayerId[], record: TieBreakRecord | null) => void;
  onCancel: () => void;
  disabled: boolean;
}>) {
  // What the table has entered so far, rule by rule, and the inputs being typed.
  const [answers, setAnswers] = useState<
    Record<string, Record<string, number>>
  >({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  // Null until the table changes the proposal by hand.
  const [picked, setPicked] = useState<PlayerId[] | null>(null);

  const nameOf = (id: PlayerId) =>
    players.find(p => p.id === id)?.name ?? "Joueur";
  const result = resolveTieBreak(
    players.map(p => ({ playerId: p.id, score: scores[p.id] ?? 0 })),
    direction,
    rules,
    { currentPlayerId, answers },
  );
  const winners = picked ?? result.winners;
  const tiedScore = scores[result.tied[0]] ?? 0;

  return (
    <Modal
      onClose={onCancel}
      dismissable={false}
      label="Égalité"
      className="w-full max-w-sm rounded-xl border border-black/10 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-zinc-900"
    >
      <h2 className="text-base font-semibold">Égalité 🤝</h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        {formatNames(result.tied.map(nameOf))} terminent à {tiedScore} points.
      </p>

      {result.pending ? (
        <PendingRule
          rule={result.pending}
          asking={result.asking}
          nameOf={nameOf}
          draft={draft}
          onDraft={setDraft}
          onSubmit={values => {
            setAnswers(a => ({ ...a, [result.pending?.key ?? ""]: values }));
            setDraft({});
          }}
        />
      ) : (
        <Outcome
          steps={result.steps}
          shared={result.shared}
          tied={result.tied}
          winners={winners}
          nameOf={nameOf}
          onToggle={id => {
            setPicked(toggled(winners, id));
          }}
        />
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-black/10 px-4 py-2 text-sm transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
        >
          Annuler
        </button>
        <button
          type="button"
          disabled={disabled || result.pending !== null || winners.length === 0}
          onClick={() => {
            onConfirm(
              winners,
              recordForWinners(tieBreakRecord(result), winners),
            );
          }}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          Terminer
        </button>
      </div>
    </Modal>
  );
}

/** The values the table has to enter for the rule currently being applied. */
function PendingRule({
  rule,
  asking,
  nameOf,
  draft,
  onDraft,
  onSubmit,
}: Readonly<{
  rule: TieBreakRule;
  asking: PlayerId[];
  nameOf: (id: PlayerId) => string;
  draft: Record<string, string>;
  onDraft: (
    update: (d: Record<string, string>) => Record<string, string>,
  ) => void;
  onSubmit: (values: Record<string, number>) => void;
}>) {
  const parsed = asking.map(id => {
    const text = draft[id]?.trim() ?? "";
    const n = Number(text);

    return { id, value: text !== "" && Number.isFinite(n) ? n : null };
  });
  const complete = parsed.every(e => e.value !== null);

  return (
    <div className="mt-4 flex flex-col gap-2">
      <p className="text-sm font-semibold">{rule.label}</p>
      {rule.help ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{rule.help}</p>
      ) : null}

      {asking.map(id => (
        <div key={id} className="flex items-center justify-between gap-2">
          <span className="min-w-0 flex-1 truncate text-sm">{nameOf(id)}</span>
          <input
            type="number"
            inputMode="numeric"
            value={draft[id] ?? ""}
            onChange={e => {
              const { value } = e.target;
              onDraft(d => ({ ...d, [id]: value }));
            }}
            aria-label={`${rule.label} — ${nameOf(id)}`}
            className="w-20 rounded-lg border border-black/15 bg-white px-2 py-1 text-right outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900"
          />
        </div>
      ))}

      <button
        type="button"
        disabled={!complete}
        onClick={() => {
          onSubmit(Object.fromEntries(parsed.map(e => [e.id, e.value ?? 0])));
        }}
        className="rounded-lg bg-amber-400 px-3 py-2 text-sm font-semibold text-black transition hover:bg-amber-300 disabled:opacity-60"
      >
        Départager
      </button>
    </div>
  );
}

/** The applied rules and the resulting winner(s), still tappable to change. */
function Outcome({
  steps,
  shared,
  tied,
  winners,
  nameOf,
  onToggle,
}: Readonly<{
  steps: TieBreakStep[];
  shared: boolean;
  tied: PlayerId[];
  winners: PlayerId[];
  nameOf: (id: PlayerId) => string;
  onToggle: (id: PlayerId) => void;
}>) {
  return (
    <div className="mt-4 flex flex-col gap-3">
      {steps.length > 0 ? (
        <ul className="flex flex-col gap-1 text-sm">
          {steps.map(step => (
            <StepLine key={step.key} step={step} nameOf={nameOf} />
          ))}
        </ul>
      ) : null}

      {shared ? (
        <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          Aucune règle ne les départage : victoire partagée.
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Touche un nom pour ajouter ou retirer un gagnant.
        </p>
        {tied.map(id => {
          const isWinner = winners.includes(id);

          return (
            <button
              key={id}
              type="button"
              onClick={() => onToggle(id)}
              className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                isWinner
                  ? "border-amber-500 bg-amber-500/10 font-semibold"
                  : "border-black/10 hover:border-indigo-400 dark:border-white/10"
              }`}
            >
              {isWinner ? "🏆 " : ""}
              {nameOf(id)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
