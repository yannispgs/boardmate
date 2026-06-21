"use client";

import { type FormEvent, useRef, useState } from "react";

import type { Boardgame, BoardgameId, NewBoardgame } from "@/lib/domain";
import { useBoardgames } from "@/lib/hooks/use-boardgames";

interface FormState {
  name: string;
  minPlayers: string;
  maxPlayers: string;
  recMinPlayers: string;
  recMaxPlayers: string;
  avgDurationMin: string;
  tags: string;
}

const EMPTY: FormState = {
  name: "",
  minPlayers: "",
  maxPlayers: "",
  recMinPlayers: "",
  recMaxPlayers: "",
  avgDurationMin: "",
  tags: "",
};

function fromBoardgame(b: Boardgame): FormState {
  return {
    name: b.name,
    minPlayers: b.minPlayers?.toString() ?? "",
    maxPlayers: b.maxPlayers?.toString() ?? "",
    recMinPlayers: b.recMinPlayers?.toString() ?? "",
    recMaxPlayers: b.recMaxPlayers?.toString() ?? "",
    avgDurationMin: b.avgDurationMin?.toString() ?? "",
    tags: b.tags.join(", "),
  };
}

const toNum = (s: string): number | null => {
  const t = s.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

function toInput(form: FormState, logoUrl: string | null): NewBoardgame {
  return {
    name: form.name.trim(),
    logoUrl,
    minPlayers: toNum(form.minPlayers),
    maxPlayers: toNum(form.maxPlayers),
    recMinPlayers: toNum(form.recMinPlayers),
    recMaxPlayers: toNum(form.recMaxPlayers),
    avgDurationMin: toNum(form.avgDurationMin),
    tags: form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
  };
}

const field =
  "rounded-lg border border-black/15 bg-white px-3 py-2 outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900";

export function BoardgamesManager() {
  const {
    boardgames,
    loading,
    error,
    addBoardgame,
    editBoardgame,
    removeBoardgame,
    uploadLogo,
  } = useBoardgames();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [editingId, setEditingId] = useState<BoardgameId | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const editing = editingId !== null;

  function resetForm() {
    setForm(EMPTY);
    setEditingId(null);
    setLogoUrl(null);
    setFormError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function closeForm() {
    resetForm();
    setFormOpen(false);
  }

  function openCreate() {
    resetForm();
    setFormOpen(true);
  }

  function startEdit(b: Boardgame) {
    setForm(fromBoardgame(b));
    setEditingId(b.id);
    setLogoUrl(b.logoUrl);
    setFormError(null);
    setFormOpen(true);
  }

  async function handleLogo(event: FormEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    setUploading(true);
    setFormError(null);
    try {
      setLogoUrl(await uploadLogo(file));
    } catch {
      setFormError("Envoi du logo impossible.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (form.name.trim() === "") return;
    setSubmitting(true);
    setFormError(null);
    try {
      const input = toInput(form, logoUrl);
      if (editingId) {
        await editBoardgame(editingId, input);
      } else {
        await addBoardgame(input);
      }
      closeForm();
    } catch {
      setFormError(
        editing ? "Modification impossible." : "Ajout impossible. Réessaie.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(b: Boardgame) {
    if (!confirm(`Supprimer « ${b.name} » ?`)) return;
    try {
      await removeBoardgame(b.id);
      if (editingId === b.id) closeForm();
    } catch {
      // A boardgame that already has games cannot be deleted (DB restricts it).
      alert("Suppression impossible : ce jeu a déjà des parties enregistrées.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      {/* Existing boardgames first */}
      {loading ? (
        <p className="text-sm text-zinc-500">Chargement…</p>
      ) : boardgames.length === 0 ? (
        <p className="text-sm text-zinc-500">Aucun jeu pour l&apos;instant.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {boardgames.map((b) => (
            <li
              key={b.id}
              className="flex items-center gap-3 rounded-xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-zinc-900"
            >
              {b.logoUrl ? (
                // biome-ignore lint/performance/noImgElement: arbitrary Storage URLs, no next/image loader configured yet
                <img
                  src={b.logoUrl}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <span
                  aria-hidden
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-black/5 text-lg dark:bg-white/5"
                >
                  🎲
                </span>
              )}
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{b.name}</span>
                <span className="text-xs text-zinc-500">{formatMeta(b)}</span>
              </div>
              <button
                type="button"
                onClick={() => startEdit(b)}
                className="rounded-md border border-black/10 px-2 py-1 text-sm transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
              >
                Modifier
              </button>
              <button
                type="button"
                onClick={() => handleDelete(b)}
                className="rounded-md border border-black/10 px-2 py-1 text-sm text-red-600 transition hover:bg-red-50 dark:border-white/15 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add a boardgame: the creation form lives below the list, behind a button */}
      {formOpen ? (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 rounded-xl border border-black/10 p-4 dark:border-white/10"
        >
          <h2 className="text-sm font-semibold">
            {editing ? "Modifier le jeu" : "Nouveau jeu"}
          </h2>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nom du jeu"
            aria-label="Nom du jeu"
            maxLength={80}
            className={field}
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Joueurs min
              <input
                type="number"
                min={1}
                value={form.minPlayers}
                onChange={(e) =>
                  setForm({ ...form, minPlayers: e.target.value })
                }
                className={field}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Joueurs max
              <input
                type="number"
                min={1}
                value={form.maxPlayers}
                onChange={(e) =>
                  setForm({ ...form, maxPlayers: e.target.value })
                }
                className={field}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Conseillé min
              <input
                type="number"
                min={1}
                value={form.recMinPlayers}
                onChange={(e) =>
                  setForm({ ...form, recMinPlayers: e.target.value })
                }
                className={field}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Conseillé max
              <input
                type="number"
                min={1}
                value={form.recMaxPlayers}
                onChange={(e) =>
                  setForm({ ...form, recMaxPlayers: e.target.value })
                }
                className={field}
              />
            </label>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Durée moyenne (min)
              <input
                type="number"
                min={0}
                value={form.avgDurationMin}
                onChange={(e) =>
                  setForm({ ...form, avgDurationMin: e.target.value })
                }
                className={field}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Tags (séparés par des virgules)
              <input
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="famille, stratégie"
                className={field}
              />
            </label>
          </div>
          <div className="flex items-center gap-3">
            {logoUrl ? (
              // biome-ignore lint/performance/noImgElement: arbitrary Storage URLs, no next/image loader configured yet
              <img
                src={logoUrl}
                alt="Logo"
                className="h-12 w-12 rounded-lg object-cover"
              />
            ) : null}
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Logo
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleLogo}
                className="text-sm"
              />
            </label>
            {uploading ? (
              <span className="text-xs text-zinc-500">Envoi…</span>
            ) : null}
          </div>

          {formError ? (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {formError}
            </p>
          ) : null}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting || uploading || form.name.trim() === ""}
              className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
            >
              {editing ? "Enregistrer" : "Ajouter"}
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
          + Ajouter un jeu
        </button>
      )}
    </div>
  );
}

function formatMeta(b: Boardgame): string {
  const parts: string[] = [];
  if (b.minPlayers != null && b.maxPlayers != null) {
    parts.push(
      b.minPlayers === b.maxPlayers
        ? `${b.minPlayers} joueurs`
        : `${b.minPlayers}–${b.maxPlayers} joueurs`,
    );
  }
  if (b.avgDurationMin != null) parts.push(`~${b.avgDurationMin} min`);
  if (b.tags.length > 0) parts.push(b.tags.join(" · "));
  return parts.join(" · ") || "Aucune info";
}
