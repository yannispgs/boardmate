"use client";

import { type FormEvent, useState } from "react";
import { buildDefaults, validateConfigValues } from "@/lib/config/validation";
import type { BoardgameId, Config, ConfigId, ConfigValues } from "@/lib/domain";
import { useConfigs } from "@/lib/hooks/use-configs";
import { ConfigField } from "./ConfigField";

export function ConfigsManager({ boardgameId }: { boardgameId: BoardgameId }) {
  const { template, configs, loading, error, saveConfig, removeConfig } =
    useConfigs(boardgameId);

  const [name, setName] = useState("");
  const [values, setValues] = useState<ConfigValues>({});
  const [editingId, setEditingId] = useState<ConfigId | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  const editing = editingId !== null;

  // Seed the form with template defaults once the template arrives.
  if (template && !ready) {
    setValues(buildDefaults(template.fields));
    setReady(true);
  }

  function resetForm() {
    setName("");
    setValues(template ? buildDefaults(template.fields) : {});
    setEditingId(null);
    setFieldErrors({});
    setFormError(null);
  }

  function startEdit(config: Config) {
    setName(config.name);
    setValues(config.values);
    setEditingId(config.id);
    setFieldErrors({});
    setFormError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!template) return;
    const trimmed = name.trim();
    if (trimmed === "") return;

    const result = validateConfigValues(template.fields, values);
    if (!result.success) {
      const errs: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (key && !errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      setFormError("Certains champs sont invalides.");
      return;
    }

    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      await saveConfig(trimmed, result.data, editingId ?? undefined);
      resetForm();
    } catch {
      setFormError("Enregistrement impossible. Réessaie.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(config: Config) {
    if (!confirm(`Supprimer la configuration « ${config.name} » ?`)) return;
    try {
      await removeConfig(config.id);
      if (editingId === config.id) resetForm();
    } catch {
      setFormError("Suppression impossible.");
    }
  }

  if (loading) return <p className="text-sm text-zinc-500">Chargement…</p>;

  if (!template) {
    return (
      <p className="text-sm text-zinc-500">
        Ce jeu n&apos;a pas encore de modèle de configuration. Les modèles sont
        définis dans les données du projet (pas d&apos;éditeur en v1).
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-xl border border-black/10 p-4 dark:border-white/10"
      >
        <h2 className="text-sm font-semibold">
          {editing ? "Modifier la configuration" : "Nouvelle configuration"}
        </h2>
        <label className="flex flex-col gap-1">
          <span className="font-medium">Nom</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex. Partie rapide"
            maxLength={80}
            className="rounded-lg border border-black/15 bg-white px-3 py-2 outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900"
          />
        </label>

        {template.fields.map((field) => (
          <ConfigField
            key={field.key}
            field={field}
            value={values[field.key]}
            error={fieldErrors[field.key]}
            onChange={(v) => setValues((prev) => ({ ...prev, [field.key]: v }))}
          />
        ))}

        {formError ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {formError}
          </p>
        ) : null}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting || name.trim() === ""}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
          >
            {editing ? "Enregistrer" : "Créer"}
          </button>
          {editing ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-black/10 px-4 py-2 transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
            >
              Annuler
            </button>
          ) : null}
        </div>
      </form>

      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      {configs.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Aucune configuration pour l&apos;instant.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {configs.map((config) => (
            <li
              key={config.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-zinc-900"
            >
              <span className="truncate font-medium">{config.name}</span>
              <span className="flex gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(config)}
                  className="rounded-md border border-black/10 px-2 py-1 text-sm transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
                >
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(config)}
                  className="rounded-md border border-black/10 px-2 py-1 text-sm text-red-600 transition hover:bg-red-50 dark:border-white/15 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  Supprimer
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
