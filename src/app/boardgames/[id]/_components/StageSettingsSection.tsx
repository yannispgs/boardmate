"use client";

import { useState } from "react";

import { ErrorText } from "@/components/ErrorText";
import { fieldClass } from "@/components/ui";
import type { BoardgameId, StageSpec } from "@/lib/domain";
import {
  STAGE_COUNT_MAX,
  STAGE_LABEL_MAX,
  stageCountKind,
  stageSettingsError,
  withStageSettings,
} from "@/lib/game/stage-settings";
import { useBoardgames } from "@/lib/hooks/use-boardgames";

const sectionHeading =
  "text-sm font-semibold uppercase tracking-wide text-zinc-400";

/**
 * « Manches »: what a game played in manches calls one, and how many it lasts.
 *
 * The name can always be changed; the count only where the rules fix it (Luz).
 * A calendar's length is shown but not offered — each of its manches has its
 * own number of laps, which is the rulebook's — and a game nobody can see the
 * end of says so. Nothing is drawn for a game turning in plain laps.
 */
export function StageSettingsSection({
  boardgameId,
}: Readonly<{ boardgameId: BoardgameId }>) {
  const { boardgames, editBoardgame } = useBoardgames();
  const stages = boardgames.find(b => b.id === boardgameId)?.stages;

  if (!stages) {
    return null;
  }

  return (
    <StageSettingsForm
      stages={stages}
      onSave={next => editBoardgame(boardgameId, { stages: next })}
    />
  );
}

function StageSettingsForm({
  stages,
  onSave,
}: Readonly<{
  stages: StageSpec;
  onSave: (stages: StageSpec) => Promise<void>;
}>) {
  const kind = stageCountKind(stages);
  const [label, setLabel] = useState(stages.label);
  const [count, setCount] = useState(String(stages.count ?? 1));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const settings = { label, count: Number(count) };
  const invalid = stageSettingsError(settings);
  const changed =
    label.trim() !== stages.label ||
    (kind === "fixed" && settings.count !== stages.count);
  const plural = `${(label.trim() || stages.label).toLowerCase()}s`;

  async function save() {
    setSaving(true);
    setError(null);

    try {
      // Laid over the spec as it is NOW — never rebuilt from this form, which
      // shows neither the bet nor the ladder nor the calendar.
      await onSave(withStageSettings(stages, settings));
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
    <section className="flex flex-col gap-3" data-testid="stage-settings">
      <h2 className={sectionHeading}>Manches</h2>

      <div className="flex flex-col gap-3 rounded-xl border border-black/10 p-4 text-sm dark:border-white/10">
        <label className="flex flex-col gap-1">
          <span className="font-medium">Nom d&apos;une manche</span>
          <input
            value={label}
            maxLength={STAGE_LABEL_MAX}
            onChange={e => setLabel(e.target.value)}
            className={fieldClass}
          />
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Au singulier, tel que la table le dit : « Donne », « Génération ».
          </span>
        </label>

        {kind === "fixed" ? (
          <label className="flex flex-col gap-1">
            <span className="font-medium">Nombre de {plural}</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={STAGE_COUNT_MAX}
              value={count}
              onChange={e => setCount(e.target.value)}
              className={fieldClass}
            />
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              La partie s&apos;arrête une fois la dernière notée.
            </span>
          </label>
        ) : (
          <p className="text-zinc-500 dark:text-zinc-400">
            {kind === "schedule"
              ? `${stages.schedule?.length} ${plural}, de ${stages.schedule?.join(", ")} tours : le calendrier vient des règles du jeu.`
              : `Pas de nombre fixe de ${plural} : la fin de partie vient des règles du jeu.`}
          </p>
        )}

        <ErrorText message={changed ? (error ?? invalid) : error} />

        <div className="flex items-center justify-end gap-3">
          {saved ? (
            <span className="text-xs text-emerald-600 dark:text-emerald-400">
              Enregistré
            </span>
          ) : null}
          <button
            type="button"
            disabled={!changed || invalid !== null || saving}
            onClick={save}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-40"
          >
            Enregistrer les manches
          </button>
        </div>
      </div>
    </section>
  );
}
