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
  GameStage,
  Player,
} from "@/lib/domain";
import { initialScoreFor } from "@/lib/game/scoring";
import { tracksPlayerTurns } from "@/lib/game/turn-time";
import { useBoardgames } from "@/lib/hooks/use-boardgames";
import { useConfigs } from "@/lib/hooks/use-configs";
import { useGames } from "@/lib/hooks/use-games";
import { PlayerCountNote } from "../../_components/PlayerCountNote";
import { PlayerPickCardList } from "../../_components/PlayerPickCardList";
import { tileClass } from "../../_components/tile-class";
import { usePlayerPick } from "../../_components/use-player-pick";
import { FunnelStep } from "./FunnelStep";
import { RecapStep } from "./RecapStep";

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
    stages: GameStage[],
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
        stages,
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
        ordered={tracksPlayerTurns(boardgame)}
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
  ordered,
  initial,
  onConfirm,
  onBack,
}: Readonly<{
  minPlayers: number | null;
  maxPlayers: number | null;
  /**
   * Whether the game hands the turn from one player to the next. When it does
   * not, picking is just a checkmark: the click order still seats the players
   * — it orders the score sheet — but it ranks nobody, and numbering it would
   * promise a turn order the game never plays.
   */
  ordered: boolean;
  initial: Player[];
  onConfirm: (players: Player[]) => void;
  onBack: () => void;
}>) {
  const pick = usePlayerPick({ initial, minPlayers, maxPlayers });

  return (
    <FunnelStep
      title={
        ordered
          ? "3 · Choisis les joueurs (dans l’ordre de jeu)"
          : "3 · Choisis les joueurs"
      }
      onBack={onBack}
      footer={
        <>
          <PlayerCountNote
            count={pick.selected.length}
            minPlayers={minPlayers}
            maxPlayers={maxPlayers}
            tooMany={pick.tooMany}
          />

          <button
            type="button"
            disabled={!pick.canContinue}
            onClick={() => onConfirm(pick.picked)}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
          >
            Continuer →
          </button>
        </>
      }
    >
      <ListState
        loading={pick.loading}
        empty={pick.active.length === 0}
        emptyLabel="Aucun joueur actif. Ajoute-en dans « Joueurs »."
      >
        <PlayerPickCardList
          players={pick.listed}
          selected={pick.selected}
          ordered={ordered}
          onToggle={pick.toggle}
          onReorder={pick.reorder}
        />
      </ListState>
    </FunnelStep>
  );
}
