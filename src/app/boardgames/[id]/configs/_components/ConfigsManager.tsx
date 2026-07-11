"use client";

import { type FormEvent, useState } from "react";
import { ConfigField } from "@/components/ConfigField";
import { useConfirm } from "@/components/use-confirm";
import { buildDefaults, validateConfigValues } from "@/lib/config/validation";
import type {
  BoardgameId,
  Config,
  ConfigId,
  ConfigTemplate,
  ConfigValues,
} from "@/lib/domain";
import { useConfigs } from "@/lib/hooks/use-configs";
import { ConfigCardList } from "./ConfigCardList";
import { ConfigDefaultsEditor } from "./ConfigDefaultsEditor";

interface FormInit {
  name: string;
  values: ConfigValues;
  editingId: ConfigId | null;
}

export function ConfigsManager({ boardgameId }: { boardgameId: BoardgameId }) {
  const {
    template,
    configs,
    loading,
    error,
    saveConfig,
    removeConfig,
    saveDefaults,
  } = useConfigs(boardgameId);

  const [formInit, setFormInit] = useState<FormInit | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [editingDefaults, setEditingDefaults] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const { requestConfirm, confirmDialog } = useConfirm();

  function openForm(init: FormInit) {
    setEditingDefaults(false);
    setFormInit(init);
    setFormKey(k => k + 1); // remount the form with fresh initial state
  }

  async function submitDefaults(defaults: ConfigValues) {
    await saveDefaults(defaults);
    setEditingDefaults(false);
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
    requestConfirm({
      message: `Supprimer la configuration « ${config.name} » ?`,
      confirmLabel: "Supprimer",
      onConfirm: () => deleteConfig(config),
    });
  }

  async function deleteConfig(config: Config) {
    setActionError(null);
    try {
      await removeConfig(config.id);
      if (formInit?.editingId === config.id) {
        setFormInit(null);
      }
    } catch {
      setActionError("Suppression impossible.");
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Chargement…</p>;
  }

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

      <ConfigCardList
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
      ) : editingDefaults ? (
        <ConfigDefaultsEditor
          template={template}
          onSave={submitDefaults}
          onCancel={() => setEditingDefaults(false)}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500"
          >
            + Nouvelle configuration
          </button>
          <button
            type="button"
            onClick={() => setEditingDefaults(true)}
            className="rounded-lg border border-black/10 px-4 py-2 font-medium transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
          >
            Modifier la configuration par défaut
          </button>
        </div>
      )}

      {confirmDialog}
    </div>
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
    if (trimmed === "") {
      return;
    }

    const result = validateConfigValues(template.fields, values);
    if (!result.success) {
      const errs: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (key && !errs[key]) {
          errs[key] = issue.message;
        }
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
          onChange={e => setName(e.target.value)}
          placeholder="ex. Partie rapide"
          maxLength={80}
          className="rounded-lg border border-black/15 bg-white px-3 py-2 outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900"
        />
      </label>

      {template.fields.map(field => (
        <ConfigField
          key={field.key}
          field={field}
          value={values[field.key]}
          error={fieldErrors[field.key]}
          onChange={v => setValues(prev => ({ ...prev, [field.key]: v }))}
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
