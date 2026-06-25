"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { Boardgame, ConfigId, PlayerId } from "@/lib/domain";
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
  const [configId, setConfigId] = useState<ConfigId | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function launch(playerIds: PlayerId[]) {
    if (!boardgame) {
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const game = await createGame({
        boardgameId: boardgame.id,
        configId,
        playerIds,
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
                    setConfigId(null);
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
        onPick={cid => {
          setConfigId(cid);
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
        creating={creating}
        error={error}
        onBack={() => setStep(2)}
        onConfirm={launch}
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
  onPick: (configId: ConfigId | null) => void;
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
                onClick={() => onPick(c.id)}
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
  creating,
  error,
  onConfirm,
  onBack,
}: {
  minPlayers: number | null;
  maxPlayers: number | null;
  creating: boolean;
  error: string | null;
  onConfirm: (ids: PlayerId[]) => void;
  onBack: () => void;
}) {
  const { players, loading } = usePlayers();
  const [selected, setSelected] = useState<PlayerId[]>([]);

  const active = players.filter(p => p.isActive);

  function toggle(id: PlayerId) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  }

  const tooFew = minPlayers != null && selected.length < minPlayers;
  const tooMany = maxPlayers != null && selected.length > maxPlayers;
  const canStart = selected.length >= 1 && !tooFew && !tooMany && !creating;

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
      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        disabled={!canStart}
        onClick={() => onConfirm(selected)}
        className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
      >
        {creating ? "Création…" : "Lancer la partie"}
      </button>
    </Step>
  );
}
