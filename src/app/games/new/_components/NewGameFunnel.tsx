"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ConfigField } from "@/components/ConfigField";
import { useConfirm } from "@/components/use-confirm";
import { buildDefaults, validateConfigValues } from "@/lib/config/validation";
import type {
  Boardgame,
  Config,
  ConfigValues,
  Player,
  PlayerId,
} from "@/lib/domain";
import { useBoardgames } from "@/lib/hooks/use-boardgames";
import { useConfigs } from "@/lib/hooks/use-configs";
import { useGames } from "@/lib/hooks/use-games";
import { usePlayers } from "@/lib/hooks/use-players";

const tileClass =
  "rounded-xl border border-black/10 bg-white px-4 py-3 text-left transition hover:border-indigo-400 dark:border-white/10 dark:bg-zinc-900";

export function NewGameFunnel() {
  const router = useRouter();
  const { boardgames, loading } = useBoardgames();
  const { createGame } = useGames();

  const [boardgame, setBoardgame] = useState<Boardgame | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function launch(configValues: ConfigValues | null) {
    if (!boardgame) {
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const game = await createGame({
        boardgameId: boardgame.id,
        configId: config?.id ?? null,
        configValues,
        playerIds: players.map(p => p.id),
      });
      router.push(`/games/${game.id}/play`);
    } catch {
      setError("Création de la partie impossible.");
      setCreating(false);
    }
  }

  if (step === 1) {
    return (
      <Step title="1 · Choisis un jeu">
        {loading ? (
          <p className="text-sm text-zinc-500">Chargement…</p>
        ) : boardgames.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Aucun jeu. Ajoute-en un dans « Jeux » d&apos;abord.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {boardgames.map(b => (
              <li key={b.id}>
                <button
                  type="button"
                  className={`${tileClass} w-full`}
                  onClick={() => {
                    setBoardgame(b);
                    setConfig(null);
                    setPlayers([]);
                    setStep(2);
                  }}
                >
                  {b.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Step>
    );
  }

  if (step === 2 && boardgame) {
    return (
      <ConfigStep
        boardgameId={boardgame.id}
        onBack={() => setStep(1)}
        onPick={cfg => {
          setConfig(cfg);
          setStep(3);
        }}
      />
    );
  }

  if (step === 3 && boardgame) {
    return (
      <PlayersStep
        minPlayers={boardgame.minPlayers}
        maxPlayers={boardgame.maxPlayers}
        initial={players}
        onBack={() => setStep(2)}
        onConfirm={picked => {
          setPlayers(picked);
          setStep(4);
        }}
      />
    );
  }

  if (step === 4 && boardgame) {
    return (
      <RecapStep
        boardgame={boardgame}
        config={config}
        players={players}
        creating={creating}
        error={error}
        onBack={() => setStep(3)}
        onLaunch={launch}
      />
    );
  }

  return null;
}

function Step({
  title,
  children,
  onBack,
}: {
  title: string;
  children: React.ReactNode;
  onBack?: () => void;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          {title}
        </h2>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            ← Retour
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function ConfigStep({
  boardgameId,
  onPick,
  onBack,
}: {
  boardgameId: Boardgame["id"];
  onPick: (config: Config | null) => void;
  onBack: () => void;
}) {
  const { configs, loading } = useConfigs(boardgameId);

  return (
    <Step title="2 · Choisis une configuration" onBack={onBack}>
      <ul className="flex flex-col gap-2">
        <li>
          <button
            type="button"
            className={`${tileClass} w-full`}
            onClick={() => onPick(null)}
          >
            Sans configuration
          </button>
        </li>
        {loading ? (
          <li className="text-sm text-zinc-500">Chargement…</li>
        ) : (
          configs.map(c => (
            <li key={c.id}>
              <button
                type="button"
                className={`${tileClass} w-full`}
                onClick={() => onPick(c)}
              >
                {c.name}
              </button>
            </li>
          ))
        )}
      </ul>
    </Step>
  );
}

function PlayersStep({
  minPlayers,
  maxPlayers,
  initial,
  onConfirm,
  onBack,
}: {
  minPlayers: number | null;
  maxPlayers: number | null;
  initial: Player[];
  onConfirm: (players: Player[]) => void;
  onBack: () => void;
}) {
  const { players, loading } = usePlayers();
  const [selected, setSelected] = useState<PlayerId[]>(initial.map(p => p.id));

  const active = players.filter(p => p.isActive);

  function toggle(id: PlayerId) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  }

  const tooFew = minPlayers != null && selected.length < minPlayers;
  const tooMany = maxPlayers != null && selected.length > maxPlayers;
  const canContinue = selected.length >= 1 && !tooFew && !tooMany;

  function confirm() {
    // Keep the click order → seat / turn order.
    const ordered = selected
      .map(id => active.find(p => p.id === id))
      .filter((p): p is Player => p != null);

    onConfirm(ordered);
  }

  return (
    <Step title="3 · Choisis les joueurs (dans l’ordre de jeu)" onBack={onBack}>
      {loading ? (
        <p className="text-sm text-zinc-500">Chargement…</p>
      ) : active.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Aucun joueur actif. Ajoute-en dans « Joueurs ».
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {active.map(p => {
            const order = selected.indexOf(p.id);
            const picked = order !== -1;

            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => toggle(p.id)}
                  className={`${tileClass} flex w-full items-center justify-between ${
                    picked ? "border-indigo-500 ring-1 ring-indigo-500" : ""
                  }`}
                >
                  <span>{p.name}</span>
                  {picked ? (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
                      {order + 1}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-xs text-zinc-500">
        {selected.length} sélectionné{selected.length > 1 ? "s" : ""}
        {minPlayers != null || maxPlayers != null
          ? ` · recommandé ${minPlayers ?? "?"}–${maxPlayers ?? "?"}`
          : ""}
      </p>
      {tooMany ? (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          Ce jeu se joue à {maxPlayers} joueurs max.
        </p>
      ) : null}

      <button
        type="button"
        disabled={!canContinue}
        onClick={confirm}
        className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
      >
        Continuer →
      </button>
    </Step>
  );
}

function RecapStep({
  boardgame,
  config,
  players,
  creating,
  error,
  onBack,
  onLaunch,
}: {
  boardgame: Boardgame;
  config: Config | null;
  players: Player[];
  creating: boolean;
  error: string | null;
  onBack: () => void;
  onLaunch: (values: ConfigValues | null) => void;
}) {
  const { template, loading } = useConfigs(boardgame.id);
  const { requestConfirm, confirmDialog } = useConfirm();
  const [values, setValues] = useState<ConfigValues | null>(null);
  const [invalid, setInvalid] = useState<string | null>(null);

  // Prefill the form from the selected config over the template defaults, so
  // every attribute shows a value that can be tweaked for this game only.
  useEffect(() => {
    if (template) {
      setValues({
        ...buildDefaults(template.fields),
        ...(config?.values ?? {}),
      });
    }
  }, [template, config]);

  const thresholdField =
    boardgame.scoring?.winCondition.type === "threshold"
      ? boardgame.scoring.winCondition.field
      : null;
  const thresholdSpec =
    thresholdField != null
      ? (template?.fields.find(f => f.key === thresholdField) ?? null)
      : null;
  const editableFields = (template?.fields ?? []).filter(
    f => f.key !== thresholdField,
  );

  function setField(key: string, value: unknown) {
    setValues(prev => ({ ...(prev ?? {}), [key]: value }));
  }

  function handleLaunch() {
    // No template → nothing to snapshot; launch straight from the confirmation.
    if (!template) {
      requestConfirm({
        message: "Tout est prêt ? La partie va démarrer.",
        confirmLabel: "Lancer",
        onConfirm: () => onLaunch(null),
      });

      return;
    }

    const parsed = validateConfigValues(template.fields, values ?? {});
    if (!parsed.success) {
      setInvalid("Vérifie les attributs de la partie avant de lancer.");

      return;
    }

    setInvalid(null);
    requestConfirm({
      message: "Tout est prêt ? La partie va démarrer.",
      confirmLabel: "Lancer",
      onConfirm: () => onLaunch(parsed.data),
    });
  }

  const targetValue =
    thresholdField != null && typeof values?.[thresholdField] === "number"
      ? (values[thresholdField] as number)
      : "";

  return (
    <Step title="4 · Vérifie et lance la partie" onBack={onBack}>
      {loading ? (
        <p className="text-sm text-zinc-500">Chargement…</p>
      ) : (
        <>
          <dl className="flex flex-col gap-2 rounded-xl border border-black/10 bg-black/[0.02] p-4 text-sm dark:border-white/10 dark:bg-white/[0.02]">
            <div className="flex justify-between gap-3">
              <dt className="text-zinc-500 dark:text-zinc-400">Jeu</dt>
              <dd className="font-medium">{boardgame.name}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-zinc-500 dark:text-zinc-400">
                Configuration
              </dt>
              <dd className="font-medium">
                {config ? config.name : "Configuration par défaut"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-zinc-500 dark:text-zinc-400">Joueurs</dt>
              <dd className="text-right font-medium">
                {players.map((p, i) => `${i + 1}. ${p.name}`).join(" · ")}
              </dd>
            </div>
          </dl>

          {editableFields.length > 0 ? (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Attributs de la partie
              </h3>
              {editableFields.map(field => (
                <ConfigField
                  key={field.key}
                  field={field}
                  value={values?.[field.key]}
                  onChange={v => setField(field.key, v)}
                />
              ))}
            </div>
          ) : null}

          {thresholdField != null && thresholdSpec ? (
            <div className="flex flex-col gap-1 rounded-xl border border-indigo-500/40 bg-indigo-500/[0.06] p-4">
              <label
                htmlFor="win-threshold"
                className="flex items-center gap-2 font-medium"
              >
                <span aria-hidden>🎯</span>
                Score à atteindre pour gagner
              </label>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Indicatif — ajuste-le selon votre partie (extensions,
                scénario…).
              </p>
              <input
                id="win-threshold"
                type="number"
                inputMode="numeric"
                step={1}
                min={"min" in thresholdSpec ? thresholdSpec.min : undefined}
                max={"max" in thresholdSpec ? thresholdSpec.max : undefined}
                value={targetValue}
                onChange={e =>
                  setField(
                    thresholdField,
                    e.target.value === "" ? undefined : Number(e.target.value),
                  )
                }
                className="mt-1 w-28 rounded-lg border border-black/15 bg-white px-3 py-2 text-lg font-semibold tabular-nums outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900"
              />
            </div>
          ) : null}

          {invalid ? (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {invalid}
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            disabled={creating}
            onClick={handleLaunch}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
          >
            {creating ? "Création…" : "Lancer la partie"}
          </button>
          {confirmDialog}
        </>
      )}
    </Step>
  );
}
