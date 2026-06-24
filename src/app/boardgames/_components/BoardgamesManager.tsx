"use client";

import { type FormEvent, type RefObject, useRef, useState } from "react";

import { ConfirmDialog, type ConfirmRequest } from "@/components/ConfirmDialog";
import { UploadIcon } from "@/components/icons";
import type { Boardgame, BoardgameId, NewBoardgame } from "@/lib/domain";
import { useBoardgames } from "@/lib/hooks/use-boardgames";
import { BoardgameInUseError } from "@/lib/repositories/errors";
import { BoardgameCardList } from "./BoardgameCardList";

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
  if (t === "") {
    return null;
  }
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
      .map(t => t.trim())
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
  return new Promise(resolve => {
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
    if (!res.ok) {
      return { ok: false, reason: "Image inaccessible." };
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (isPng(bytes) || isJpeg(bytes)) {
      return { ok: true };
    }
    return { ok: false, reason: "Le fichier n'est pas un PNG ou un JPEG." };
  } catch {
    // CORS or network error: confirm at least that it renders as an image.
    return (await loadsAsImage(url))
      ? { ok: true }
      : { ok: false, reason: "Image inaccessible ou format non supporté." };
  }
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

  const active = boardgames.filter(b => b.isActive);
  const inactive = boardgames.filter(b => !b.isActive);

  const [formOpen, setFormOpen] = useState(false);
  const [editingBoardgame, setEditingBoardgame] = useState<Boardgame | null>(
    null,
  );
  const [formKey, setFormKey] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  function openForm(target: Boardgame | null) {
    setEditingBoardgame(target);
    setFormKey(k => k + 1); // remount the form with fresh initial state
    setFormOpen(true);
  }

  function closeForm() {
    setEditingBoardgame(null);
    setFormOpen(false);
  }

  async function submitBoardgame(
    input: NewBoardgame,
    editingId: BoardgameId | null,
  ) {
    if (editingId) {
      await editBoardgame(editingId, input);
    } else {
      await addBoardgame(input);
    }
    closeForm();
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
      if (editingBoardgame?.id === b.id) {
        closeForm();
      }
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
          <BoardgameCardList
            title="Jeux actifs"
            boardgames={active}
            onEdit={openForm}
            onToggle={b => handleToggle(b, false)}
            actionLabel="Désactiver"
            onDelete={handleDelete}
          />
          {inactive.length > 0 ? (
            <BoardgameCardList
              title="Désactivés"
              boardgames={inactive}
              onEdit={openForm}
              onToggle={b => handleToggle(b, true)}
              actionLabel="Réactiver"
              onDelete={handleDelete}
              dimmed
              collapsible
            />
          ) : null}
        </div>
      )}

      {/* Create / edit form lives below the list, behind a button */}
      {formOpen ? (
        <BoardgameForm
          key={formKey}
          initial={editingBoardgame}
          onSubmit={submitBoardgame}
          onCancel={closeForm}
          uploadLogo={uploadLogo}
        />
      ) : (
        <button
          type="button"
          onClick={() => openForm(null)}
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

function BoardgameForm({
  initial,
  onSubmit,
  onCancel,
  uploadLogo,
}: {
  initial: Boardgame | null;
  onSubmit: (
    input: NewBoardgame,
    editingId: BoardgameId | null,
  ) => Promise<void>;
  onCancel: () => void;
  uploadLogo: (file: File) => Promise<string>;
}) {
  const editing = initial !== null;
  const [form, setForm] = useState<FormState>(
    initial ? fromBoardgame(initial) : EMPTY,
  );
  const [logoUrl, setLogoUrl] = useState<string | null>(
    initial?.logoUrl ?? null,
  );
  // Show an existing logo as an editable URL (works whether it was uploaded to
  // Storage or pasted as an external link); the user can switch to "file".
  const [logoSource, setLogoSource] = useState<LogoSource>(
    initial?.logoUrl ? "url" : "file",
  );
  const [logoUrlInput, setLogoUrlInput] = useState(initial?.logoUrl ?? "");
  const [fileName, setFileName] = useState<string | null>(null);
  const [checkingUrl, setCheckingUrl] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleLogo(event: FormEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) {
      return;
    }
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
      if (fileRef.current) {
        fileRef.current.value = "";
      }
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
    if (form.name.trim() === "") {
      return;
    }
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
      // On success the parent unmounts this form; no need to reset state.
      await onSubmit(toInput(form, resolvedLogo), initial?.id ?? null);
    } catch {
      setFormError(
        editing ? "Modification impossible." : "Ajout impossible. Réessaie.",
      );
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-xl border border-black/10 p-4 dark:border-white/10"
    >
      <h2 className="text-sm font-semibold">
        {editing ? "Modifier le jeu" : "Nouveau jeu"}
      </h2>
      <input
        value={form.name}
        onChange={e => setForm({ ...form, name: e.target.value })}
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
            onChange={e => setForm({ ...form, minPlayers: e.target.value })}
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Joueurs max
          <input
            type="number"
            min={1}
            value={form.maxPlayers}
            onChange={e => setForm({ ...form, maxPlayers: e.target.value })}
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Conseillé min
          <input
            type="number"
            min={1}
            value={form.recMinPlayers}
            onChange={e => setForm({ ...form, recMinPlayers: e.target.value })}
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Conseillé max
          <input
            type="number"
            min={1}
            value={form.recMaxPlayers}
            onChange={e => setForm({ ...form, recMaxPlayers: e.target.value })}
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
            onChange={e => setForm({ ...form, avgDurationMin: e.target.value })}
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Tags (séparés par des virgules)
          <input
            value={form.tags}
            onChange={e => setForm({ ...form, tags: e.target.value })}
            placeholder="famille, stratégie"
            className={field}
          />
        </label>
      </div>

      <LogoPicker
        logoUrl={logoUrl}
        logoSource={logoSource}
        logoUrlInput={logoUrlInput}
        fileName={fileName}
        uploading={uploading}
        checkingUrl={checkingUrl}
        fileRef={fileRef}
        onSwitchSource={switchSource}
        onPickFile={handleLogo}
        onUrlChange={setLogoUrlInput}
        onUrlBlur={checkLogoUrl}
      />

      {formError ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {formError}
        </p>
      ) : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={
            submitting || uploading || checkingUrl || form.name.trim() === ""
          }
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          {editing ? "Enregistrer" : "Ajouter"}
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

function LogoPicker({
  logoUrl,
  logoSource,
  logoUrlInput,
  fileName,
  uploading,
  checkingUrl,
  fileRef,
  onSwitchSource,
  onPickFile,
  onUrlChange,
  onUrlBlur,
}: {
  logoUrl: string | null;
  logoSource: LogoSource;
  logoUrlInput: string;
  fileName: string | null;
  uploading: boolean;
  checkingUrl: boolean;
  fileRef: RefObject<HTMLInputElement | null>;
  onSwitchSource: (next: LogoSource) => void;
  onPickFile: (event: FormEvent<HTMLInputElement>) => void;
  onUrlChange: (value: string) => void;
  onUrlBlur: () => void;
}) {
  const tab = (source: LogoSource, label: string) => (
    <button
      type="button"
      onClick={() => onSwitchSource(source)}
      aria-pressed={logoSource === source}
      className={`px-3 py-1 transition ${
        logoSource === source
          ? "bg-indigo-600 text-white"
          : "hover:bg-black/5 dark:hover:bg-white/5"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">Logo</span>
        <div className="flex overflow-hidden rounded-lg border border-black/15 text-xs dark:border-white/15">
          {tab("file", "Fichier")}
          {tab("url", "URL")}
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
              <UploadIcon />
              {fileName ? "Changer d'image" : "Choisir une image"}
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={onPickFile}
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
            onChange={e => onUrlChange(e.target.value)}
            onBlur={onUrlBlur}
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
  );
}
