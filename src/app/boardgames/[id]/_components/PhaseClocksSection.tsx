"use client";

import { useState } from "react";

import { ErrorText } from "@/components/ErrorText";
import { fieldClass } from "@/components/ui";
import type {
  Boardgame,
  BoardgameId,
  PhaseClock,
  PhaseMode,
  PhaseSpec,
} from "@/lib/domain";
import {
  clocksFor,
  PHASE_CLOCK_LABELS,
  withPhaseClocks,
} from "@/lib/game/phase";
import { useBoardgames } from "@/lib/hooks/use-boardgames";

const sectionHeading =
  "text-sm font-semibold uppercase tracking-wide text-zinc-400";

/** How a phase is played, said the way the table says it. */
const MODE_LABEL: Readonly<Record<PhaseMode, string>> = {
  sequential: "Tour par tour",
  simultaneous: "Tous en même temps",
};

/**
 * « Phases de la manche »: the phases a game's stage is played in, and the one
 * thing about them a table may change — what each is timed with.
 *
 * The phases themselves are the rulebook's: their names, their order and how
 * each is played are written by migration and shown here read-only. Only the
 * clock is a preference, so it is the only control. Nothing at all is drawn for
 * a game that declares no phases, which is every game but one today.
 */
export function PhaseClocksSection({
  boardgameId,
}: Readonly<{ boardgameId: BoardgameId }>) {
  const { boardgames, editBoardgame } = useBoardgames();
  const boardgame = boardgames.find(b => b.id === boardgameId);

  if (!boardgame?.phases || boardgame.phases.length === 0) {
    return null;
  }

  return (
    <PhaseClocksForm
      boardgame={boardgame}
      phases={boardgame.phases}
      onSave={phases => editBoardgame(boardgameId, { phases })}
    />
  );
}

function PhaseClocksForm({
  boardgame,
  phases,
  onSave,
}: Readonly<{
  boardgame: Boardgame;
  phases: PhaseSpec[];
  onSave: (phases: PhaseSpec[]) => Promise<void>;
}>) {
  const [picked, setPicked] = useState<Record<string, PhaseClock>>(() =>
    Object.fromEntries(phases.map(phase => [phase.key, phase.clock])),
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changed = phases.some(phase => picked[phase.key] !== phase.clock);

  async function save() {
    setSaving(true);
    setError(null);

    try {
      // Laid over the phases as they are NOW, by key — never rebuilt from what
      // this form shows, which would drop the draft block it does not show.
      await onSave(withPhaseClocks(phases, picked));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Enregistrement impossible.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="flex flex-col gap-3" data-testid="phase-clocks">
      <h2 className={sectionHeading}>Phases de la manche</h2>

      <div className="flex flex-col gap-3 rounded-xl border border-black/10 p-4 text-sm dark:border-white/10">
        <p className="text-zinc-500 dark:text-zinc-400">
          Les phases viennent des règles du jeu. Pour chacune, choisis ce qui la
          chronomètre.
        </p>

        {/* The master switch still wins (option A, 2026-08-21): unticked, no
            clock runs whatever a phase says — said here rather than leaving
            a table to wonder why its choice changes nothing. */}
        {boardgame.timed ? null : (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-amber-800 dark:text-amber-200">
            Ce jeu n&apos;est pas chronométré : aucune horloge ne tournera tant
            que « Chronométrer les tours » reste décoché.
          </p>
        )}

        <ol className="flex flex-col divide-y divide-black/5 dark:divide-white/5">
          {phases.map((phase, index) => (
            <li
              key={phase.key}
              className="flex flex-wrap items-center justify-between gap-2 py-2"
            >
              <span className="flex min-w-0 flex-col">
                <span className="font-medium">
                  {index + 1}. {phase.label}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {MODE_LABEL[phase.mode]}
                </span>
              </span>

              <select
                aria-label={`Horloge de la phase ${phase.label}`}
                value={picked[phase.key]}
                onChange={e =>
                  setPicked(current => ({
                    ...current,
                    [phase.key]: e.target.value as PhaseClock,
                  }))
                }
                className={fieldClass}
              >
                {clocksFor(phase.mode).map(clock => (
                  <option key={clock} value={clock}>
                    {PHASE_CLOCK_LABELS[clock]}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ol>

        <ErrorText message={error} />

        <div className="flex items-center justify-end gap-3">
          {saved ? (
            <span className="text-xs text-emerald-600 dark:text-emerald-400">
              Enregistré
            </span>
          ) : null}
          <button
            type="button"
            disabled={!changed || saving}
            onClick={save}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-40"
          >
            Enregistrer les horloges
          </button>
        </div>
      </div>
    </section>
  );
}
