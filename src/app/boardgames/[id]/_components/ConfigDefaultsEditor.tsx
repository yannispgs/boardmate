"use client";

import { type FormEvent, useState } from "react";

import { ConfigFieldList } from "@/components/ConfigFieldList";
import {
  buildDefaults,
  collectFieldErrors,
  validateConfigValues,
} from "@/lib/config/validation";
import type { ConfigTemplate, ConfigValues } from "@/lib/domain";

/**
 * Edits a boardgame's *default* configuration — the values (timer included) that
 * pre-fill every new config for this game. Reuses {@link ConfigField} so the
 * defaults are tuned from the UI instead of the seed data. Pre-filled from the
 * template's current defaults; saved back onto the template.
 */
export function ConfigDefaultsEditor({
  template,
  onSave,
  onCancel,
}: {
  template: ConfigTemplate;
  onSave: (defaults: ConfigValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<ConfigValues>(() =>
    buildDefaults(template.fields),
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = validateConfigValues(template.fields, values);
    if (!result.success) {
      setFieldErrors(collectFieldErrors(result.error));
      setFormError("Certains champs sont invalides.");
      return;
    }

    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      // On success the parent unmounts this form; no need to reset state.
      await onSave(result.data);
    } catch {
      setFormError("Enregistrement impossible. Réessaie.");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-xl border border-black/10 p-4 dark:border-white/10"
    >
      <p className="text-xs text-zinc-500">
        Ces valeurs pré-remplissent chaque nouvelle configuration de ce jeu.
      </p>

      <ConfigFieldList
        fields={template.fields}
        values={values}
        errors={fieldErrors}
        onChange={(key, v) => setValues(prev => ({ ...prev, [key]: v }))}
      />

      {formError ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {formError}
        </p>
      ) : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          Enregistrer les valeurs par défaut
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-black/10 px-4 py-2 transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
