"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ListState } from "@/components/ListState";
import type {
  Boardgame,
  Config,
  ConfigValues,
  ExtensionId,
  ExtensionScenarioId,
  Player,
  PlayerId,
} from "@/lib/domain";
import { initialScoreFor } from "@/lib/game/scoring";
import { useBoardgames } from "@/lib/hooks/use-boardgames";
import { useConfigs } from "@/lib/hooks/use-configs";
import { useGames } from "@/lib/hooks/use-games";
import { usePlayers } from "@/lib/hooks/use-players";
import { FunnelStep } from "./FunnelStep";
import { PlayerPickCardList } from "./PlayerPickCardList";
import { RecapStep } from "./RecapStep";
import { tileClass } from "./tile-class";

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

  async function launch(
    configValues: ConfigValues | null,
    extensionIds: ExtensionId[],
    scenarioByExtension: Record<ExtensionId, ExtensionScenarioId>,
  ) {
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
        initialScore: initialScoreFor(boardgame.scoring),
        extensionIds,
        scenarioByExtension,
      });
      router.push(`/games/${game.id}/play`);
    } catch {
      setError("Création de la partie impossible.");
      setCreating(false);
    }
  }

  if (step === 1) {
    return (
      <FunnelStep title="1 · Choisis un jeu">
        <ListState
          loading={loading}
          empty={boardgames.length === 0}
          emptyLabel={<>Aucun jeu. Ajoute-en un dans « Jeux » d&apos;abord.</>}
        >
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
        </ListState>
      </FunnelStep>
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
        simultaneous={boardgame.turnMode === "simultaneous"}
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
        onReorderPlayers={setPlayers}
        onLaunch={launch}
      />
    );
  }

  return null;
}

function ConfigStep({
  boardgameId,
  onPick,
  onBack,
}: Readonly<{
  boardgameId: Boardgame["id"];
  onPick: (config: Config | null) => void;
  onBack: () => void;
}>) {
  const { configs, loading } = useConfigs(boardgameId);

  return (
    <FunnelStep title="2 · Choisis une configuration" onBack={onBack}>
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
    </FunnelStep>
  );
}

function PlayersStep({
  minPlayers,
  maxPlayers,
  simultaneous,
  initial,
  onConfirm,
  onBack,
}: Readonly<{
  minPlayers: number | null;
  maxPlayers: number | null;
  /** Simultaneous games have no turn order — selection is just a checkmark. */
  simultaneous: boolean;
  initial: Player[];
  onConfirm: (players: Player[]) => void;
  onBack: () => void;
}>) {
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

  // The click order is the seat / turn order.
  const picked = selected
    .map(id => active.find(p => p.id === id))
    .filter((p): p is Player => p != null);
  // Picked players sit at the top of the list, first seat first, so the order
  // being built is read at a glance rather than hunted for among the others.
  const listed = [...picked, ...active.filter(p => !selected.includes(p.id))];

  return (
    <FunnelStep
      title={
        simultaneous
          ? "3 · Choisis les joueurs"
          : "3 · Choisis les joueurs (dans l’ordre de jeu)"
      }
      onBack={onBack}
      footer={
        <>
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
            onClick={() => onConfirm(picked)}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
          >
            Continuer →
          </button>
        </>
      }
    >
      <ListState
        loading={loading}
        empty={active.length === 0}
        emptyLabel="Aucun joueur actif. Ajoute-en dans « Joueurs »."
      >
        <PlayerPickCardList
          players={listed}
          selected={selected}
          simultaneous={simultaneous}
          onToggle={toggle}
        />
      </ListState>
    </FunnelStep>
  );
}
