"use client";

import {
  type ClipboardEvent,
  type FormEvent,
  type RefObject,
  useRef,
  useState,
} from "react";
import { InfoTip } from "@/components/InfoTip";
import { ChevronRightIcon, PencilIcon, UploadIcon } from "@/components/icons";
import {
  BOARD_GENERATORS,
  type BoardGeneratorId,
  type Boardgame,
  type BoardgameId,
  type BoardgameKind,
  type NewBoardgame,
  type ScoreSheetItem,
  type ScoringSpec,
  type TurnMode,
  type WinCondition,
} from "@/lib/domain";
import { ScoreSheetEditor } from "./ScoreSheetEditor";

interface FormState {
  name: string;
  minPlayers: string;
  maxPlayers: string;
  recMinPlayers: string;
  recMaxPlayers: string;
  avgDurationMin: string;
  // Fixed number of rounds after which the game ends (empty = open-ended).
  roundLimit: string;
  tags: string;
  // Sequential turns, or everyone-plays-at-once (Splito).
  turnMode: TurnMode;
  kind: BoardgameKind;
  // Break the stats down by turn order (first / middle / last to play).
  trackSeatStats: boolean;
  // The generator that draws this game's board ("" = played on no such board).
  boardGenerator: BoardGeneratorId | "";
  // Dice tracking (e.g. Catan's 2×d6): when on, `diceCount` × d`diceSides`.
  diceTracked: boolean;
  diceCount: string;
  diceSides: string;
  scored: boolean;
  scoreTiming: "final" | "live";
  // "total" = one number per player; "categories" = a per-category scoresheet
  // (edited via ScoreSheetEditor).
  entry: "total" | "categories";
  winKind: WinCondition["type"];
  thresholdField: string;
  allowNegative: boolean;
}

const EMPTY: FormState = {
  name: "",
  minPlayers: "",
  maxPlayers: "",
  recMinPlayers: "",
  recMaxPlayers: "",
  avgDurationMin: "",
  roundLimit: "",
  tags: "",
  turnMode: "sequential",
  kind: "competitive",
  trackSeatStats: false,
  boardGenerator: "",
  diceTracked: false,
  diceCount: "",
  diceSides: "",
  scored: false,
  scoreTiming: "final",
  entry: "total",
  winKind: "highest",
  thresholdField: "",
  allowNegative: false,
};

function fromBoardgame(b: Boardgame): FormState {
  const s = b.scoring;

  return {
    name: b.name,
    minPlayers: b.minPlayers?.toString() ?? "",
    maxPlayers: b.maxPlayers?.toString() ?? "",
    recMinPlayers: b.recMinPlayers?.toString() ?? "",
    recMaxPlayers: b.recMaxPlayers?.toString() ?? "",
    avgDurationMin: b.avgDurationMin?.toString() ?? "",
    roundLimit: b.roundLimit?.toString() ?? "",
    tags: b.tags.join(", "),
    turnMode: b.turnMode,
    kind: b.kind,
    trackSeatStats: b.trackSeatStats,
    boardGenerator: b.boardGenerator ?? "",
    diceTracked: b.dice !== null,
    diceCount: b.dice?.count?.toString() ?? "",
    diceSides: b.dice?.sides?.toString() ?? "",
    scored: s !== null,
    scoreTiming: s?.timing ?? "final",
    entry: s?.entry ?? "total",
    winKind: s?.winCondition.type ?? "highest",
    thresholdField:
      s?.winCondition.type === "threshold" ? s.winCondition.field : "",
    allowNegative: s?.allowNegative ?? false,
  };
}

/**
 * Trims labels and drops the leftovers of editing: fields with no label, and
 * sections with no label or no usable fields. Keeps every field's key, colours
 * and a section's ranking bonus intact.
 */
function cleanSheet(sheet: ScoreSheetItem[]): ScoreSheetItem[] {
  const clean: ScoreSheetItem[] = [];

  for (const item of sheet) {
    if ("categories" in item) {
      const categories = item.categories
        .map(c => ({ ...c, label: c.label.trim() }))
        .filter(c => c.label !== "");

      if (item.label.trim() !== "" && categories.length > 0) {
        clean.push({ ...item, label: item.label.trim(), categories });
      }
    } else if (item.label.trim() !== "") {
      clean.push({ ...item, label: item.label.trim() });
    }
  }

  return clean;
}

/** Builds the scoring spec from the form's fields and the edited category sheet. */
function formToScoring(
  form: FormState,
  sheet: ScoreSheetItem[],
): ScoringSpec | null {
  if (!form.scored) {
    return null;
  }

  const winCondition: WinCondition =
    form.winKind === "threshold"
      ? {
          type: "threshold",
          field: form.thresholdField.trim() || "pointsToWin",
        }
      : { type: form.winKind };

  const categories = form.entry === "categories";

  return {
    timing: form.scoreTiming,
    entry: form.entry,
    winCondition,
    allowNegative: form.allowNegative,
    ...(categories ? { sheet: cleanSheet(sheet) } : {}),
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

function toInput(
  form: FormState,
  logoUrl: string | null,
  scoring: ScoringSpec | null,
): NewBoardgame {
  return {
    name: form.name.trim(),
    logoUrl,
    minPlayers: toNum(form.minPlayers),
    maxPlayers: toNum(form.maxPlayers),
    roundLimit: toNum(form.roundLimit),
    recMinPlayers: toNum(form.recMinPlayers),
    recMaxPlayers: toNum(form.recMaxPlayers),
    avgDurationMin: toNum(form.avgDurationMin),
    tags: form.tags
      .split(",")
      .map(t => t.trim())
      .filter(Boolean),
    turnMode: form.turnMode,
    kind: form.kind,
    trackSeatStats: form.trackSeatStats,
    boardGenerator: form.boardGenerator === "" ? null : form.boardGenerator,
    dice: form.diceTracked
      ? {
          count: toNum(form.diceCount) ?? 2,
          sides: toNum(form.diceSides) ?? 6,
        }
      : null,
    scoring,
  };
}

const field =
  "rounded-lg border border-black/15 bg-white px-3 py-2 outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900";

type LogoSource = "file" | "url" | "paste";

/** Image MIME types accepted everywhere a logo can come in (file/paste). */
const LOGO_MIME = ["image/png", "image/jpeg"];

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

/**
 * The add / edit boardgame form. Descriptive fields first (name, players,
 * duration, tags, logo), the scoring block last. `initial` null = creation.
 * `onSubmit` receives the built input and the id being edited (or null).
 */
export function BoardgameForm({
  initial,
  onSubmit,
  onCancel,
  uploadLogo,
  saved = false,
}: {
  initial: Boardgame | null;
  onSubmit: (
    input: NewBoardgame,
    editingId: BoardgameId | null,
  ) => Promise<void>;
  onCancel: () => void;
  uploadLogo: (file: File) => Promise<string>;
  /** When true, shows a transient "Enregistré" next to the submit button. */
  saved?: boolean;
}) {
  const editing = initial !== null;
  const [form, setForm] = useState<FormState>(
    initial ? fromBoardgame(initial) : EMPTY,
  );
  const [sheet, setSheet] = useState<ScoreSheetItem[]>(
    initial?.scoring?.sheet ?? [],
  );
  const [logoUrl, setLogoUrl] = useState<string | null>(
    initial?.logoUrl ?? null,
  );
  const [logoSource, setLogoSource] = useState<LogoSource>("file");
  const [logoUrlInput, setLogoUrlInput] = useState("");
  // An existing logo is shown as a preview and left untouched unless the user
  // clicks "modifier". We must NOT load it into the URL picker by default:
  // re-validating a Storage URL as a plain link fails (CORS) and blocks saving.
  const [logoEditing, setLogoEditing] = useState(initial?.logoUrl == null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [checkingUrl, setCheckingUrl] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Uploads any logo image (picked file or pasted from the clipboard) to Storage
  // and previews it. `label` is what the UI shows as the chosen source.
  async function uploadFile(file: File, label: string) {
    setFileName(label);
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

  function handleLogo(event: FormEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) {
      return;
    }

    uploadFile(file, file.name);
  }

  // Reveal the logo picker (a fresh one) to replace the existing logo.
  function startEditLogo() {
    setLogoEditing(true);
    setLogoSource("file");
    setLogoUrl(null);
    setLogoUrlInput("");
    setFileName(null);
    setFormError(null);
    if (fileRef.current) {
      fileRef.current.value = "";
    }
  }

  // Cancel a logo change and keep the one already saved.
  function cancelEditLogo() {
    setLogoEditing(false);
    setLogoSource("file");
    setLogoUrl(initial?.logoUrl ?? null);
    setFormError(null);
  }

  function switchSource(next: LogoSource) {
    setLogoSource(next);
    setFormError(null);
    if (next !== "url") {
      // Leaving URL mode (to file or paste): drop any URL preview/input.
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
      // Resolve the logo. An untouched existing logo keeps its value as-is (no
      // re-validation — its Storage URL isn't a plain fetchable link). While
      // editing in URL mode, (re)validate the pasted link before saving.
      let resolvedLogo = logoUrl;
      if (logoEditing && logoSource === "url") {
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
      // On create the parent navigates away; on edit it stays, so re-enable the
      // button for further tweaks.
      const scoring = formToScoring(form, sheet);
      await onSubmit(toInput(form, resolvedLogo, scoring), initial?.id ?? null);
      setSubmitting(false);
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
          Nombre de tours (vide = illimité)
          <input
            type="number"
            min={1}
            value={form.roundLimit}
            onChange={e => setForm({ ...form, roundLimit: e.target.value })}
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

      <label className="flex flex-col gap-1 text-xs text-zinc-500">
        Mode de jeu
        <select
          value={form.turnMode}
          onChange={e =>
            setForm({ ...form, turnMode: e.target.value as TurnMode })
          }
          className={field}
        >
          <option value="sequential">Chacun son tour</option>
          <option value="simultaneous">Tout le monde joue en même temps</option>
        </select>
        <span className="text-[11px] text-zinc-400">
          « Tout le monde en même temps » (ex. Splito) : un seul tour partagé
          par round, sans rotation joueur par joueur.
        </span>
      </label>

      <label className="flex flex-col gap-1 text-xs text-zinc-500">
        Type de jeu
        <select
          value={form.kind}
          onChange={e =>
            setForm({ ...form, kind: e.target.value as BoardgameKind })
          }
          className={field}
        >
          <option value="competitive">Compétitif</option>
          <option value="cooperative">Coopératif</option>
          <option value="hybrid">Hybride</option>
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.trackSeatStats}
          onChange={e => setForm({ ...form, trackSeatStats: e.target.checked })}
        />
        Suivre les statistiques selon l&apos;ordre de jeu
        <InfoTip label="À quoi sert le suivi selon l'ordre de jeu">
          <p>
            Active un tableau de stats{" "}
            <strong>Premier / Intermédiaire / Dernier</strong>&nbsp;à jouer,
            pour les jeux où l&apos;ordre de jeu influence l&apos;issue (Catan).
          </p>
          <p>Sans effet sur le déroulé d&apos;une partie.</p>
        </InfoTip>
      </label>

      <label className="flex flex-col gap-1 text-xs text-zinc-500">
        Générateur de plateau
        <select
          value={form.boardGenerator}
          onChange={e =>
            setForm({
              ...form,
              boardGenerator: e.target.value as BoardGeneratorId | "",
            })
          }
          className={field}
        >
          <option value="">Aucun</option>
          {BOARD_GENERATORS.map(g => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <span className="text-[11px] text-zinc-400">
          Ajoute une étape en fin de création de partie : le plateau est tiré au
          sort avant de lancer, en tenant compte des extensions actives.
        </span>
      </label>

      <fieldset className="flex flex-col gap-2 rounded-lg border border-black/10 p-3 dark:border-white/10">
        <legend className="px-1 text-xs text-zinc-500">Dés</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.diceTracked}
            onChange={e => setForm({ ...form, diceTracked: e.target.checked })}
          />
          Suivre les lancers de dés
        </label>
        {form.diceTracked ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Nombre de dés
              <input
                type="number"
                min={1}
                value={form.diceCount}
                onChange={e => setForm({ ...form, diceCount: e.target.value })}
                className={field}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Faces par dé
              <input
                type="number"
                min={2}
                value={form.diceSides}
                onChange={e => setForm({ ...form, diceSides: e.target.value })}
                className={field}
              />
            </label>
          </div>
        ) : null}
      </fieldset>

      {!logoEditing && initial?.logoUrl ? (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-zinc-500">Logo</span>
          <div className="flex items-center gap-2">
            {/* biome-ignore lint/performance/noImgElement: arbitrary Storage URLs, no next/image loader configured yet */}
            <img
              src={initial.logoUrl}
              alt="Logo"
              className="h-12 w-12 shrink-0 rounded-lg object-cover"
            />
            <button
              type="button"
              onClick={startEditLogo}
              aria-label="Modifier le logo"
              title="Modifier le logo"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/15 text-zinc-500 transition hover:border-indigo-400 hover:text-indigo-600 dark:border-white/15"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
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
            onPasteImage={file => uploadFile(file, "Image collée")}
            onPasteError={setFormError}
          />
          {initial?.logoUrl ? (
            <button
              type="button"
              onClick={cancelEditLogo}
              className="self-start text-xs text-zinc-500 transition hover:underline"
            >
              Annuler la modification du logo
            </button>
          ) : null}
        </div>
      )}

      <fieldset className="flex flex-col gap-2 rounded-lg border border-black/10 p-3 dark:border-white/10">
        <legend className="px-1 text-xs text-zinc-500">Score</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.scored}
            onChange={e => setForm({ ...form, scored: e.target.checked })}
          />
          Ce jeu se joue avec des points
        </label>

        {form.scored ? (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs text-zinc-500">
                <span className="flex items-center gap-1">
                  Comptage
                  <InfoTip label="Quand les points sont comptés">
                    <p>
                      <strong>À la fin</strong> = on saisit les scores une fois
                      la partie terminée (Cascadia, Wingspan).
                    </p>
                    <p>
                      <strong>En direct</strong> = on suit le score pendant la
                      partie et la victoire se détecte automatiquement (Catan).
                    </p>
                  </InfoTip>
                </span>
                <select
                  value={form.scoreTiming}
                  onChange={e =>
                    setForm({
                      ...form,
                      scoreTiming: e.target.value as FormState["scoreTiming"],
                    })
                  }
                  className={field}
                >
                  <option value="final">À la fin de la partie</option>
                  <option value="live">En direct (pendant la partie)</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-zinc-500">
                Condition de victoire
                <select
                  value={form.winKind}
                  onChange={e =>
                    setForm({
                      ...form,
                      winKind: e.target.value as FormState["winKind"],
                    })
                  }
                  className={field}
                >
                  <option value="highest">Le plus de points gagne</option>
                  <option value="lowest">Le moins de points gagne</option>
                  <option value="threshold">
                    Atteindre un objectif de points
                  </option>
                </select>
              </label>
            </div>

            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Décompte des points
              <select
                value={form.entry}
                onChange={e =>
                  setForm({
                    ...form,
                    entry: e.target.value as FormState["entry"],
                  })
                }
                className={field}
              >
                <option value="total">Un total par joueur</option>
                <option value="categories">Par catégories de points</option>
              </select>
            </label>

            {form.winKind === "threshold" ? (
              <label className="flex flex-col gap-1 text-xs text-zinc-500">
                <span className="flex items-center gap-1">
                  Champ de configuration de l&apos;objectif
                  <InfoTip label="À quoi sert le champ d'objectif">
                    <p>
                      Clé du champ de configuration qui fixe le nombre de points
                      à atteindre pour gagner (par défaut&nbsp;: pointsToWin).
                    </p>
                    <p>
                      Sa valeur est réglable par partie dans la configuration.
                    </p>
                  </InfoTip>
                </span>
                <input
                  value={form.thresholdField}
                  onChange={e =>
                    setForm({ ...form, thresholdField: e.target.value })
                  }
                  placeholder="pointsToWin"
                  className={field}
                />
              </label>
            ) : null}

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.allowNegative}
                onChange={e =>
                  setForm({ ...form, allowNegative: e.target.checked })
                }
              />
              Les scores peuvent être négatifs
              <InfoTip label="Scores négatifs">
                <p>Autorise un score en dessous de 0.</p>
                <p>
                  Décoché (défaut), le contrôle&nbsp;−/+ et la saisie sont
                  bloqués au plancher du jeu (Catan&nbsp;: 2).
                </p>
              </InfoTip>
            </label>

            {form.entry === "categories" ? (
              <details className="group flex flex-col gap-2">
                <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-zinc-400">
                  <ChevronRightIcon className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
                  Détail des catégories
                </summary>
                <div className="mt-1">
                  <ScoreSheetEditor value={sheet} onChange={setSheet} />
                </div>
              </details>
            ) : null}
          </div>
        ) : null}
      </fieldset>

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
        {saved ? (
          <span
            role="status"
            className="flex items-center text-sm font-medium text-emerald-600 dark:text-emerald-400"
          >
            Enregistré ✓
          </span>
        ) : null}
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
  onPasteImage,
  onPasteError,
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
  onPasteImage: (file: File) => void;
  onPasteError: (message: string) => void;
}) {
  // Pull an accepted image out of a paste event (Ctrl/Cmd+V into the drop zone).
  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const item = Array.from(event.clipboardData?.items ?? []).find(i =>
      LOGO_MIME.includes(i.type),
    );

    if (!item) {
      onPasteError("Le presse-papier ne contient pas d'image PNG ou JPEG.");
      return;
    }

    const file = item.getAsFile();
    if (file) {
      onPasteImage(file);
    }
  }

  // Convenience for the click path: read the clipboard via the async API (needs
  // permission + a secure context). Falls back to the paste zone on failure.
  async function readClipboard() {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find(t => LOGO_MIME.includes(t));
        if (type) {
          const blob = await item.getType(type);
          const ext = type === "image/png" ? "png" : "jpg";
          onPasteImage(new File([blob], `collage.${ext}`, { type }));
          return;
        }
      }
      onPasteError("Aucune image dans le presse-papier.");
    } catch {
      onPasteError(
        "Accès au presse-papier refusé. Colle l'image (Ctrl/Cmd + V) dans la zone.",
      );
    }
  }

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
          {tab("paste", "Coller")}
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
        ) : logoSource === "url" ? (
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
        ) : (
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <textarea
              readOnly
              onPaste={handlePaste}
              aria-label="Zone de collage du logo"
              placeholder={
                fileName ?? "Clique ici puis colle une image (Ctrl/Cmd + V)"
              }
              rows={2}
              className={`flex-1 resize-none cursor-text text-sm ${field}`}
            />
            <button
              type="button"
              onClick={readClipboard}
              className="self-start text-xs text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Coller depuis le presse-papier
            </button>
          </div>
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
