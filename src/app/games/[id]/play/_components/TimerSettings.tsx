"use client";

import { useState } from "react";

import { ErrorText } from "@/components/ErrorText";
import { Modal } from "@/components/Modal";
import { ModalHeader } from "@/components/ModalHeader";
import { fieldClass, modalCardClass } from "@/components/ui";
import type { TurnSchedule } from "@/lib/domain";
import { formatDuration } from "@/lib/game/format-time";
import {
  fixedSchedule,
  isFixedSchedule,
  scheduleError,
  turnDurationForRound,
} from "@/lib/game/turn-schedule";

/** A typed number of seconds, `NaN` for a field left empty. */
function seconds(value: string): number {
  return value.trim() === "" ? Number.NaN : Number(value);
}

function SecondsField({
  label,
  value,
  onChange,
}: Readonly<{ label: string; value: string; onChange: (v: string) => void }>) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
      <span className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={value}
          onChange={e => onChange(e.target.value)}
          aria-label={label}
          className={`${fieldClass} w-28 bg-transparent tabular-nums outline-none focus:border-indigo-500`}
        />
        <span className="text-sm text-zinc-500">s</span>
      </span>
    </label>
  );
}

/**
 * The timer's settings, for this party only: how long a turn lasts — or, on a
 * game whose turns grow round by round, how long the first one lasts, what each
 * round adds and where it stops. The game's configuration is never touched.
 *
 * The turn being played takes its new length at once, on the round it is in,
 * keeping the time already played: forty seconds into a turn cut from ninety to
 * sixty leaves twenty.
 *
 * The clock holds while the sheet is open (`onHold`), so the time left it
 * previews is the time left when it is applied.
 */
export function TimerSettings({
  original,
  schedule,
  round,
  elapsedS,
  onSave,
  onHold,
}: Readonly<{
  /**
   * The configuration's settings. They say which settings there are to set: a
   * game whose turns all last the same has one, whatever it is set to here.
   */
  original: TurnSchedule;
  /** The settings the turns are timed on now: this party's own, or the same. */
  schedule: TurnSchedule;
  round: number;
  /** The time played on the turn in progress. */
  elapsedS: number;
  /** New settings, or `null` to go back to the configuration's. */
  onSave: (schedule: TurnSchedule | null) => void;
  onHold: (hold: boolean) => void;
}>) {
  const [open, setOpen] = useState(false);
  const fixed = isFixedSchedule(original);
  const changed = schedule !== original;
  const [base, setBase] = useState("");
  const [step, setStep] = useState("");
  const [max, setMax] = useState("");

  const typed = fixed
    ? fixedSchedule(seconds(base))
    : { baseS: seconds(base), stepS: seconds(step), maxS: seconds(max) };
  const error = scheduleError(typed);
  const turnS = error === null ? turnDurationForRound(typed, round) : null;

  function start() {
    setBase(schedule.baseS.toString());
    setStep(schedule.stepS.toString());
    setMax(schedule.maxS.toString());
    onHold(true);
    setOpen(true);
  }

  function close() {
    onHold(false);
    setOpen(false);
  }

  function save(next: TurnSchedule | null) {
    onSave(next);
    close();
  }

  return (
    <>
      <button
        type="button"
        aria-label="Réglages du minuteur"
        onClick={start}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-lg shadow-sm transition hover:bg-zinc-50 dark:border-white/15 dark:bg-zinc-900 dark:hover:bg-zinc-800"
      >
        ⏱️
      </button>

      {open ? (
        <Modal
          onClose={close}
          label="Réglages du minuteur"
          className={`${modalCardClass} max-w-sm`}
        >
          <ModalHeader
            title="Réglages du minuteur"
            hint="Pour cette partie seulement. Le minuteur est en attente."
            onClose={close}
          />

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
            {fixed ? (
              <SecondsField
                label="Durée d'un tour"
                value={base}
                onChange={setBase}
              />
            ) : (
              <>
                <SecondsField
                  label="Durée de la 1ʳᵉ manche"
                  value={base}
                  onChange={setBase}
                />
                <SecondsField
                  label="Ajout par manche"
                  value={step}
                  onChange={setStep}
                />
                <SecondsField label="Plafond" value={max} onChange={setMax} />
              </>
            )}

            {turnS === null ? (
              <ErrorText message={error} />
            ) : (
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                {fixed ? "Ce tour" : `Manche ${round} : ce tour`} dure{" "}
                <span className="font-semibold tabular-nums">
                  {formatDuration(turnS)}
                </span>
                {" · "}
                {turnS - elapsedS >= 0 ? (
                  <>
                    il reste{" "}
                    <span className="font-semibold tabular-nums">
                      {formatDuration(turnS - elapsedS)}
                    </span>
                  </>
                ) : (
                  <span className="font-semibold tabular-nums text-red-600 dark:text-red-400">
                    +{formatDuration(elapsedS - turnS)} de dépassement
                  </span>
                )}
              </p>
            )}

            {changed ? (
              <button
                type="button"
                onClick={() => save(null)}
                className="self-start text-sm text-zinc-500 underline-offset-2 hover:underline"
              >
                Revenir aux réglages de la configuration
              </button>
            ) : null}
          </div>

          <div className="flex gap-2 border-t border-black/10 p-4 dark:border-white/10">
            <button
              type="button"
              onClick={close}
              className="flex-1 rounded-lg border border-black/10 px-4 py-2.5 font-medium transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={error !== null}
              onClick={() => save(typed)}
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
            >
              Valider
            </button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
