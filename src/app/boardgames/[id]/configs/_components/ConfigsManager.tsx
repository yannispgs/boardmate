"use client";

import { type FormEvent, useState } from "react";
import { buildDefaults, validateConfigValues } from "@/lib/config/validation";
import type { BoardgameId, Config, ConfigId, ConfigValues } from "@/lib/domain";
import { useBoardgames } from "@/lib/hooks/use-boardgames";
import { useConfigs } from "@/lib/hooks/use-configs";
import { ConfigField } from "./ConfigField";

interface ConfirmRequest {
  message: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
}

export function ConfigsManager({ boardgameId }: { boardgameId: BoardgameId }) {
  const { template, configs, loading, error, saveConfig, removeConfig } =
    useConfigs(boardgameId);
  const { boardgames } = useBoardgames();
  const boardgame = boardgames.find((b) => b.id === boardgameId);

  const [name, setName] = useState("");
  const [values, setValues] = useState<ConfigValues>({});
  const [editingId, setEditingId] = useState<ConfigId | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
  // In-app confirmation (replaces window.confirm, which browsers suppress).
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  const editing = editingId !== null;

  // Seed the form with template defaults once the template arrives.
  if (template && !ready) {
    setValues(buildDefaults(template.fields));
    setReady(true);
  }

  function closeForm() {
    setName("");
    setValues(template ? buildDefaults(template.fields) : {});
    setEditingId(null);
    setFieldErrors({});
    setFormError(null);
    setFormOpen(false);
  }

  function openCreate() {
    setName("");
    setValues(template ? buildDefaults(template.fields) : {});
    setEditingId(null);
    setFieldErrors({});
    setFormError(null);
    setFormOpen(true);
  }

  function startEdit(config: Config) {
    setName(config.name);
    setValues(config.values);
    setEditingId(config.id);
    setFieldErrors({});
    setFormError(null);
    setFormOpen(true);
  }

  // Duplicate: load the create form pre-filled with an existing config's values
  // (and a distinct name), so saving makes a NEW config.
  function startDuplicate(config: Config) {
    setName(`${config.name} (copie)`);
    setValues(config.values);
    setEditingId(null);
    setFieldErrors({});
    setFormError(null);
    setFormOpen(true);
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
      closeForm();
    } catch {
      setFormError("Enregistrement impossible. Réessaie.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleDelete(config: Config) {
    setConfirm({
      message: `Supprimer la configuration « ${config.name} » ?`,
      confirmLabel: "Supprimer",
      onConfirm: () => deleteConfig(config),
    });
  }

  async function deleteConfig(config: Config) {
    setActionError(null);
    try {
      await removeConfig(config.id);
      if (editingId === config.id) closeForm();
    } catch {
      setActionError("Suppression impossible.");
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
    <div className="flex flex-col gap-6">
      {/* Which boardgame these configs belong to. */}
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Jeu :{" "}
        <span className="font-medium text-current">
          {boardgame?.name ?? "…"}
        </span>
      </p>

      {actionError ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {actionError}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      {/* Existing configs first */}
      {configs.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Aucune configuration pour l&apos;instant.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {configs.map((config) => (
            <li
              key={config.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-zinc-900"
            >
              <span className="min-w-0 flex-1 truncate font-medium">
                {config.name}
              </span>
              <button
                type="button"
                onClick={() => startDuplicate(config)}
                aria-label={`Dupliquer ${config.name}`}
                title="Dupliquer"
                className="rounded-md border border-black/10 p-1.5 transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => startEdit(config)}
                aria-label={`Modifier ${config.name}`}
                title="Modifier"
                className="rounded-md border border-black/10 p-1.5 transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => handleDelete(config)}
                aria-label={`Supprimer ${config.name}`}
                title="Supprimer"
                className="rounded-md border border-black/10 p-1.5 text-red-600 transition hover:bg-red-50 dark:border-white/15 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" x2="10" y1="11" y2="17" />
                  <line x1="14" x2="14" y1="11" y2="17" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Create / edit form lives below the list, behind a button */}
      {formOpen ? (
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
              onChange={(v) =>
                setValues((prev) => ({ ...prev, [field.key]: v }))
              }
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
            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg border border-black/10 px-4 py-2 transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
            >
              Annuler
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={openCreate}
          className="self-start rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500"
        >
          + Nouvelle configuration
        </button>
      )}

      {confirm ? (
        <ConfigConfirmDialog
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            const run = confirm.onConfirm;
            setConfirm(null);
            void run();
          }}
        />
      ) : null}
    </div>
  );
}

function ConfigConfirmDialog({
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-sm rounded-xl border border-black/10 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-zinc-900">
        <p className="whitespace-pre-line text-sm">{message}</p>
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
            onClick={onConfirm}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
