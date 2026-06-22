"use client";

import { type FormEvent, useState } from "react";
import { ConfirmDialog, type ConfirmRequest } from "@/components/ConfirmDialog";
import { CopyIcon, PencilIcon, TrashIcon } from "@/components/icons";
import { buildDefaults, validateConfigValues } from "@/lib/config/validation";
import type {
  BoardgameId,
  Config,
  ConfigId,
  ConfigTemplate,
  ConfigValues,
} from "@/lib/domain";
import { useConfigs } from "@/lib/hooks/use-configs";
import { ConfigField } from "./ConfigField";

interface FormInit {
  name: string;
  values: ConfigValues;
  editingId: ConfigId | null;
}

const iconButton =
  "rounded-md border border-black/10 p-1.5 transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5";

export function ConfigsManager({ boardgameId }: { boardgameId: BoardgameId }) {
  const { template, configs, loading, error, saveConfig, removeConfig } =
    useConfigs(boardgameId);

  const [formInit, setFormInit] = useState<FormInit | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  function openForm(init: FormInit) {
    setFormInit(init);
    setFormKey((k) => k + 1); // remount the form with fresh initial state
  }

  function openCreate() {
    openForm({
      name: "",
      values: template ? buildDefaults(template.fields) : {},
      editingId: null,
    });
  }

  function startEdit(config: Config) {
    openForm({
      name: config.name,
      values: config.values,
      editingId: config.id,
    });
  }

  // Duplicate: open the create form pre-filled with an existing config's values
  // (distinct name, no id) so saving makes a NEW config.
  function startDuplicate(config: Config) {
    openForm({
      name: `${config.name} (copie)`,
      values: config.values,
      editingId: null,
    });
  }

  async function submitConfig(
    name: string,
    values: ConfigValues,
    editingId: ConfigId | null,
  ) {
    await saveConfig(name, values, editingId ?? undefined);
    setFormInit(null);
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
      if (formInit?.editingId === config.id) setFormInit(null);
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

      <ConfigList
        configs={configs}
        onDuplicate={startDuplicate}
        onEdit={startEdit}
        onDelete={handleDelete}
      />

      {formInit ? (
        <ConfigForm
          key={formKey}
          template={template}
          init={formInit}
          onSubmit={submitConfig}
          onCancel={() => setFormInit(null)}
        />
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
        <ConfirmDialog
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

function ConfigList({
  configs,
  onDuplicate,
  onEdit,
  onDelete,
}: {
  configs: Config[];
  onDuplicate: (config: Config) => void;
  onEdit: (config: Config) => void;
  onDelete: (config: Config) => void;
}) {
  if (configs.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Aucune configuration pour l&apos;instant.
      </p>
    );
  }

  return (
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
            onClick={() => onDuplicate(config)}
            aria-label={`Dupliquer ${config.name}`}
            title="Dupliquer"
            className={iconButton}
          >
            <CopyIcon />
          </button>
          <button
            type="button"
            onClick={() => onEdit(config)}
            aria-label={`Modifier ${config.name}`}
            title="Modifier"
            className={iconButton}
          >
            <PencilIcon />
          </button>
          <button
            type="button"
            onClick={() => onDelete(config)}
            aria-label={`Supprimer ${config.name}`}
            title="Supprimer"
            className="rounded-md border border-black/10 p-1.5 text-red-600 transition hover:bg-red-50 dark:border-white/15 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            <TrashIcon />
          </button>
        </li>
      ))}
    </ul>
  );
}

function ConfigForm({
  template,
  init,
  onSubmit,
  onCancel,
}: {
  template: ConfigTemplate;
  init: FormInit;
  onSubmit: (
    name: string,
    values: ConfigValues,
    editingId: ConfigId | null,
  ) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(init.name);
  const [values, setValues] = useState<ConfigValues>(init.values);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const editing = init.editingId !== null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      // On success the parent unmounts this form; no need to reset state.
      await onSubmit(trimmed, result.data, init.editingId);
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
