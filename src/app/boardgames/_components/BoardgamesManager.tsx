"use client";

import { type FormEvent, useRef, useState } from "react";

import type { Boardgame, BoardgameId, NewBoardgame } from "@/lib/domain";
import { useBoardgames } from "@/lib/hooks/use-boardgames";
import { BoardgameInUseError } from "@/lib/repositories/errors";

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

type LogoSource = "file" | "url";

const isPng = (b: Uint8Array): boolean =>
  b.length >= 4 &&
  b[0] === 0x89 &&
  b[1] === 0x50 &&
  b[2] === 0x4e &&
  b[3] === 0x47;

const isJpeg = (b: Uint8Array): boolean =>
  b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;

/** Resolves true if the browser can render the URL as an image (CORS-proof). */
function loadsAsImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const done = (ok: boolean) => {
      img.onload = null;
      img.onerror = null;
      resolve(ok);
    };
    img.onload = () => done(img.naturalWidth > 0);
    img.onerror = () => done(false);
    img.src = url;
  });
}

/**
 * Validates a logo URL. The app is private (auth-gated), so the goal is "is this
 * a real PNG/JPEG image" for UX, not security. When the remote server allows
 * CORS we read the magic bytes and confirm PNG/JPEG exactly; otherwise we fall
 * back to a render test (the browser loads cross-origin images for display even
 * when it can't read their bytes).
 */
async function validateLogoUrl(
  url: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: "URL invalide." };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      ok: false,
      reason: "L'URL doit commencer par http:// ou https://.",
    };
  }
  try {
    const res = await fetch(url);
    if (!res.ok) return { ok: false, reason: "Image inaccessible." };
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (isPng(bytes) || isJpeg(bytes)) return { ok: true };
    return { ok: false, reason: "Le fichier n'est pas un PNG ou un JPEG." };
  } catch {
    // CORS or network error: confirm at least that it renders as an image.
    return (await loadsAsImage(url))
      ? { ok: true }
      : { ok: false, reason: "Image inaccessible ou format non supporté." };
  }
}

interface ConfirmRequest {
  message: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
}

export function BoardgamesManager() {
  const {
    boardgames,
    loading,
    error,
    addBoardgame,
    editBoardgame,
    setActive,
    removeBoardgame,
    uploadLogo,
  } = useBoardgames();

  const active = boardgames.filter((b) => b.isActive);
  const inactive = boardgames.filter((b) => !b.isActive);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [editingId, setEditingId] = useState<BoardgameId | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoSource, setLogoSource] = useState<LogoSource>("file");
  const [logoUrlInput, setLogoUrlInput] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [checkingUrl, setCheckingUrl] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // In-app confirmation (replaces window.confirm, which browsers suppress).
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const editing = editingId !== null;

  function resetForm() {
    setForm(EMPTY);
    setEditingId(null);
    setLogoUrl(null);
    setLogoSource("file");
    setLogoUrlInput("");
    setFileName(null);
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
    // Show an existing logo as an editable URL (works whether it was uploaded
    // to Storage or pasted as an external link); the user can switch to "file".
    setLogoSource(b.logoUrl ? "url" : "file");
    setLogoUrlInput(b.logoUrl ?? "");
    setFormError(null);
    setFormOpen(true);
  }

  async function handleLogo(event: FormEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    setFileName(file.name);
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

  function switchSource(next: LogoSource) {
    setLogoSource(next);
    setFormError(null);
    if (next === "file") {
      // Going back to file input: drop any pasted URL preview.
      setLogoUrl(null);
      setLogoUrlInput("");
      setFileName(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  // Validates the pasted URL and, if valid, uses it as the logo (live preview).
  async function checkLogoUrl() {
    const url = logoUrlInput.trim();
    if (url === "") {
      setLogoUrl(null);
      setFormError(null);
      return;
    }
    setCheckingUrl(true);
    setFormError(null);
    const result = await validateLogoUrl(url);
    if (result.ok) {
      setLogoUrl(url);
    } else {
      setLogoUrl(null);
      setFormError(result.reason);
    }
    setCheckingUrl(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (form.name.trim() === "") return;
    setSubmitting(true);
    setFormError(null);
    try {
      // Resolve the logo from the active source. In URL mode, (re)validate the
      // pasted link so an unchecked or edited URL can't be saved.
      let resolvedLogo = logoUrl;
      if (logoSource === "url") {
        const url = logoUrlInput.trim();
        if (url === "") {
          resolvedLogo = null;
        } else {
          const result = await validateLogoUrl(url);
          if (!result.ok) {
            setFormError(result.reason);
            setSubmitting(false);
            return;
          }
          resolvedLogo = url;
        }
      }
      const input = toInput(form, resolvedLogo);
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

  async function deactivate(b: Boardgame) {
    setActionError(null);
    try {
      await setActive(b.id, false);
    } catch {
      setActionError("Désactivation impossible. Réessaie.");
    }
  }

  function handleToggle(b: Boardgame, nextActive: boolean) {
    // Reactivating, or hiding a boardgame that was never played, is harmless —
    // do it straight away. Only confirm when deactivating one with games, since
    // it can no longer be deleted.
    if (nextActive) {
      void setActive(b.id, true);
      return;
    }
    if (!b.hasGames) {
      void deactivate(b);
      return;
    }
    setConfirm({
      message:
        `Désactiver « ${b.name} » ?\n\n` +
        "Des parties y sont déjà enregistrées : il sortira des sélections mais " +
        "gardera son historique. Tu pourras le réactiver à tout moment.",
      confirmLabel: "Désactiver",
      onConfirm: () => deactivate(b),
    });
  }

  function handleDelete(b: Boardgame) {
    setConfirm({
      message: `Supprimer « ${b.name} » ? Cette action est définitive.`,
      confirmLabel: "Supprimer",
      onConfirm: () => deleteBoardgame(b),
    });
  }

  async function deleteBoardgame(b: Boardgame) {
    setActionError(null);
    try {
      await removeBoardgame(b.id);
      if (editingId === b.id) closeForm();
    } catch (e) {
      if (e instanceof BoardgameInUseError) {
        setActionError(
          `« ${b.name} » a déjà des parties enregistrées : impossible de le ` +
            "supprimer. Tu peux le désactiver à la place.",
        );
      } else {
        setActionError("Suppression impossible. Réessaie.");
      }
    }
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

      {/* Existing boardgames first */}
      {loading ? (
        <p className="text-sm text-zinc-500">Chargement…</p>
      ) : boardgames.length === 0 ? (
        <p className="text-sm text-zinc-500">Aucun jeu pour l&apos;instant.</p>
      ) : (
        <div className="flex flex-col gap-6">
          <BoardgameList
            title="Jeux actifs"
            boardgames={active}
            onEdit={startEdit}
            onToggle={(b) => handleToggle(b, false)}
            actionLabel="Désactiver"
            onDelete={handleDelete}
          />
          {inactive.length > 0 ? (
            <BoardgameList
              title="Désactivés"
              boardgames={inactive}
              onEdit={startEdit}
              onToggle={(b) => handleToggle(b, true)}
              actionLabel="Réactiver"
              onDelete={handleDelete}
              dimmed
              collapsible
            />
          ) : null}
        </div>
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
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">Logo</span>
              <div className="flex overflow-hidden rounded-lg border border-black/15 text-xs dark:border-white/15">
                <button
                  type="button"
                  onClick={() => switchSource("file")}
                  aria-pressed={logoSource === "file"}
                  className={`px-3 py-1 transition ${
                    logoSource === "file"
                      ? "bg-indigo-600 text-white"
                      : "hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  Fichier
                </button>
                <button
                  type="button"
                  onClick={() => switchSource("url")}
                  aria-pressed={logoSource === "url"}
                  className={`px-3 py-1 transition ${
                    logoSource === "url"
                      ? "bg-indigo-600 text-white"
                      : "hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  URL
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {logoUrl ? (
                // biome-ignore lint/performance/noImgElement: arbitrary Storage URLs, no next/image loader configured yet
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="h-12 w-12 shrink-0 rounded-lg object-cover"
                />
              ) : null}
              {logoSource === "file" ? (
                <div className="flex min-w-0 items-center gap-2">
                  <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-black/15 px-3 py-2 text-sm font-medium transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5">
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
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" x2="12" y1="3" y2="15" />
                    </svg>
                    {fileName ? "Changer d'image" : "Choisir une image"}
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={handleLogo}
                      className="sr-only"
                    />
                  </label>
                  <span className="min-w-0 truncate text-xs text-zinc-500">
                    {fileName ?? "PNG ou JPEG"}
                  </span>
                </div>
              ) : (
                <input
                  type="url"
                  inputMode="url"
                  value={logoUrlInput}
                  onChange={(e) => setLogoUrlInput(e.target.value)}
                  onBlur={checkLogoUrl}
                  placeholder="https://exemple.com/logo.png"
                  aria-label="URL du logo (PNG ou JPEG)"
                  className={`flex-1 ${field}`}
                />
              )}
              {uploading || checkingUrl ? (
                <span className="text-xs text-zinc-500">
                  {uploading ? "Envoi…" : "Vérification…"}
                </span>
              ) : null}
            </div>
          </div>

          {formError ? (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {formError}
            </p>
          ) : null}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={
                submitting ||
                uploading ||
                checkingUrl ||
                form.name.trim() === ""
              }
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

function ConfirmDialog({
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

const headingClass =
  "text-xs font-semibold uppercase tracking-wide text-zinc-400";

function BoardgameList({
  title,
  boardgames,
  onEdit,
  onToggle,
  actionLabel,
  onDelete,
  dimmed = false,
  collapsible = false,
}: {
  title: string;
  boardgames: Boardgame[];
  onEdit: (b: Boardgame) => void;
  onToggle: (b: Boardgame) => void;
  actionLabel: string;
  onDelete: (b: Boardgame) => void;
  dimmed?: boolean;
  /** Render as a disclosure, collapsed by default (hides deactivated games). */
  collapsible?: boolean;
}) {
  if (boardgames.length === 0) return null;

  const list = (
    <ul className="flex flex-col gap-2">
      {boardgames.map((b) => (
        <li
          key={b.id}
          className={`flex items-center gap-3 rounded-xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-zinc-900 ${
            dimmed ? "opacity-60" : ""
          }`}
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
            onClick={() => onEdit(b)}
            aria-label={`Modifier ${b.name}`}
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
            onClick={() => onToggle(b)}
            aria-label={`${actionLabel} ${b.name}`}
            title={actionLabel}
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
              {dimmed ? (
                // Eye — réactiver (le jeu réapparaît dans les sélections)
                <>
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </>
              ) : (
                // Eye-off — désactiver (le jeu sort des sélections)
                <>
                  <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                  <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                  <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                  <line x1="2" x2="22" y1="2" y2="22" />
                </>
              )}
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onDelete(b)}
            aria-label={`Supprimer ${b.name}`}
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
  );

  if (collapsible) {
    return (
      <details className="group flex flex-col gap-2">
        <summary
          className={`flex cursor-pointer list-none items-center gap-1.5 ${headingClass}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5 transition-transform group-open:rotate-90"
            aria-hidden="true"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
          {title} · {boardgames.length}
        </summary>
        <div className="mt-2">{list}</div>
      </details>
    );
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className={headingClass}>
        {title} · {boardgames.length}
      </h2>
      {list}
    </section>
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
