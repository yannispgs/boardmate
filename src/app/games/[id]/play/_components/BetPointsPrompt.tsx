"use client";

import { useState } from "react";

import { DialogActions } from "@/components/DialogActions";
import { Modal } from "@/components/Modal";
import type { PlayerId, StageBet } from "@/lib/domain";
import { betValues, withHedge } from "@/lib/game/bet";
import type { StageEntry } from "@/lib/game/stage-tally";

import { BetPointsRow } from "../../../_components/BetPointsRow";
import { PointsWheelPanel } from "../../../_components/PointsWheelPanel";

/**
 * The end of a donne played on bets (Luz): what each player's bet paid, and
 * whether they took the safety token. Never the bet nor the tricks — the
 * points alone say how the bet went.
 *
 * A player's points are picked on a wheel of only what the rules can pay that
 * donne, which the token changes: the wheel takes the place of the list while
 * it is open, rather than a second modal stacked on this one.
 */
export function BetPointsPrompt({
  stage,
  stageLabel,
  players,
  bet,
  initial,
  initialHedged,
  validate,
  disabled,
  confirmLabel,
  onConfirm,
  onCancel,
}: Readonly<{
  stage: number;
  /** What the box calls a manche (« Donne »). */
  stageLabel: string;
  players: Array<{ id: PlayerId; name: string }>;
  bet: StageBet;
  /** Points already entered for this donne, by player. */
  initial: Record<string, number>;
  /** Who already took the token on this donne, by player. */
  initialHedged: Record<string, boolean>;
  validate: (entries: StageEntry[]) => string | null;
  disabled: boolean;
  /** What validating does next. */
  confirmLabel: string;
  onConfirm: (points: StageEntry[]) => void;
  onCancel: () => void;
}>) {
  const unit = stageLabel.toLowerCase();
  const [points, setPoints] = useState<Record<string, number>>(initial);
  const [hedged, setHedged] = useState(initialHedged);
  // The player whose points are on the wheel, if any.
  const [editing, setEditing] = useState<PlayerId | null>(null);

  const missing = players.some(p => points[p.id] === undefined);
  const entries = players.map(p => ({
    playerId: p.id,
    points: points[p.id] ?? 0,
    hedged: hedged[p.id] === true,
  }));
  const refused = missing
    ? "Il manque les points de certains joueurs."
    : validate(entries);
  const editedName = players.find(p => p.id === editing)?.name ?? "";

  return (
    <Modal
      onClose={onCancel}
      label={`Points de la ${unit} ${stage}`}
      className="w-full max-w-sm rounded-xl border border-black/10 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-zinc-900"
    >
      {editing === null ? (
        <>
          <h2 className="text-base font-semibold">
            Fin de la {unit} {stage}
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {bet.win * stage} pour un pari réussi, {bet.hedgedWin * stage} avec
            le {bet.hedgeLabel.toLowerCase()}, sinon −{bet.missPerTrick} par pli
            d&apos;écart.
          </p>

          <ul className="mt-4 flex flex-col gap-2">
            {players.map(p => (
              <BetPointsRow
                key={p.id}
                player={p}
                stageName={`${unit} ${stage}`}
                points={points[p.id] ?? null}
                hedged={hedged[p.id] === true}
                hedgeLabel={bet.hedgeLabel}
                disabled={disabled}
                onEdit={() => setEditing(p.id)}
                onHedged={next => {
                  setHedged(current => ({ ...current, [p.id]: next }));
                  // A won bet stays won, at the token's rate.
                  setPoints(current => {
                    const moved = withHedge(
                      bet,
                      stage,
                      current[p.id] ?? null,
                      next,
                    );

                    return moved === null
                      ? current
                      : { ...current, [p.id]: moved };
                  });
                }}
              />
            ))}
          </ul>

          {refused === null ? null : (
            <p className="mt-3 text-rose-600 text-sm dark:text-rose-400">
              {refused}
            </p>
          )}

          <DialogActions
            confirmLabel={confirmLabel}
            disabled={disabled || refused !== null}
            onConfirm={() => onConfirm(entries)}
            onCancel={onCancel}
          />
        </>
      ) : (
        <PointsWheelPanel
          key={editing}
          title={`${editedName} — ${unit} ${stage}`}
          values={betValues(bet, stage, hedged[editing] === true)}
          initial={points[editing] ?? null}
          onConfirm={next => {
            setPoints(current => ({ ...current, [editing]: next }));
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      )}
    </Modal>
  );
}
