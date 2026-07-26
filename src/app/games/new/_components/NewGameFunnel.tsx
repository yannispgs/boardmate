"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConfigField } from "@/components/ConfigField";
import { HiddenMaterial } from "@/components/catan/HiddenMaterial";
import { ErrorText } from "@/components/ErrorText";
import { useConfirm } from "@/components/use-confirm";
import { hiddenMaterial } from "@/lib/catan/hidden-material";
import { buildDefaults, validateConfigValues } from "@/lib/config/validation";
import type {
  Boardgame,
  BooleanFieldSpec,
  Config,
  ConfigValues,
  ExtensionId,
  ExtensionScenarioId,
  Player,
  PlayerId,
} from "@/lib/domain";
import {
  composeConfigFields,
  scenarioTarget,
  winTargetWithModifiers,
} from "@/lib/game/extensions";
import { funnelBoard } from "@/lib/game/funnel-board";
import { initialScoreFor, optionTargetModifier } from "@/lib/game/scoring";
import { useBoardgames } from "@/lib/hooks/use-boardgames";
import { useConfigs } from "@/lib/hooks/use-configs";
import { useExtensions } from "@/lib/hooks/use-extensions";
import { useGames } from "@/lib/hooks/use-games";
import { usePlayers } from "@/lib/hooks/use-players";
import { BoardStep } from "./BoardStep";
import { ExtensionPicker } from "./ExtensionPicker";
import { FirstPlayerWheel } from "./FirstPlayerWheel";
import { FunnelStep } from "./FunnelStep";
import { PlayerPickCardList } from "./PlayerPickCardList";
import { RecapSummary } from "./RecapSummary";
import { tileClass } from "./tile-class";
import { WinTargetBar } from "./WinTargetBar";

/** The fog's preparation list, framed to sit inside the launch confirmation. */
const fogDetailsClass =
  "flex flex-col gap-3 rounded-lg border border-black/10 p-3 text-left dark:border-white/10";

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
}: {
  boardgameId: Boardgame["id"];
  onPick: (config: Config | null) => void;
  onBack: () => void;
}) {
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
}: {
  minPlayers: number | null;
  maxPlayers: number | null;
  /** Simultaneous games have no turn order — selection is just a checkmark. */
  simultaneous: boolean;
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
      {loading ? (
        <p className="text-sm text-zinc-500">Chargement…</p>
      ) : active.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Aucun joueur actif. Ajoute-en dans « Joueurs ».
        </p>
      ) : (
        <PlayerPickCardList
          players={listed}
          selected={selected}
          simultaneous={simultaneous}
          onToggle={toggle}
        />
      )}
    </FunnelStep>
  );
}

function RecapStep({
  boardgame,
  config,
  players,
  creating,
  error,
  onBack,
  onReorderPlayers,
  onLaunch,
}: {
  boardgame: Boardgame;
  config: Config | null;
  players: Player[];
  creating: boolean;
  error: string | null;
  onBack: () => void;
  onReorderPlayers: (players: Player[]) => void;
  onLaunch: (
    values: ConfigValues | null,
    extensionIds: ExtensionId[],
    scenarioByExtension: Record<ExtensionId, ExtensionScenarioId>,
  ) => void;
}) {
  const { template, loading } = useConfigs(boardgame.id);
  const extensions = useExtensions(boardgame.id);
  const { requestConfirm, confirmDialog } = useConfirm();
  const [values, setValues] = useState<ConfigValues | null>(null);
  const [invalid, setInvalid] = useState<string | null>(null);
  const [wheelOpen, setWheelOpen] = useState(false);
  // Set once the recap checks out, holding the values it validated: from there
  // the launch is one board away, and going back gives the recap as it was.
  const [ready, setReady] = useState<{ values: ConfigValues | null } | null>(
    null,
  );
  // Selected extensions and, per scenario-based one, the chosen scenario.
  const [selectedExt, setSelectedExt] = useState<ExtensionId[]>([]);
  const [scenarioByExt, setScenarioByExt] = useState<
    Record<ExtensionId, ExtensionScenarioId>
  >({});
  // Simultaneous games have no turn order → no numbered list, no first player.
  const simultaneous = boardgame.turnMode === "simultaneous";

  const active = extensions.filter(e => selectedExt.includes(e.id));
  // Config fields composed with the active extensions (fields merged by key).
  const composedFields = composeConfigFields(template?.fields ?? [], active);

  // The board this game will be set up on, once it is settled enough to draw
  // one — null for a game the app has no board to offer, which launches from
  // the recap as it always did.
  const board = funnelBoard(boardgame, active, scenarioByExt, players.length);
  // A map that keeps tiles face down needs a pile taken out of the box first,
  // and the confirmation is the last moment anyone reads before playing.
  const fogZones =
    board?.kind === "scenario" ? hiddenMaterial(board.board) : [];
  // A board to draw means one more step before the game actually starts.
  const launchLabel =
    board === null ? "Lancer la partie" : "Choisis le plateau →";

  // Prefill the form from the selected config over the (composed) template
  // defaults, so every attribute shows a value tweakable for this game only.
  // Re-seeds when the selected extensions change (their field defaults may
  // differ, e.g. a raised win target).
  useEffect(() => {
    if (template) {
      const fields = composeConfigFields(
        template.fields,
        extensions.filter(e => selectedExt.includes(e.id)),
      );
      setValues({ ...buildDefaults(fields), ...(config?.values ?? {}) });
    }
  }, [template, config, extensions, selectedExt]);

  // Options switched on can raise the target (Catan's « Maître du port » = +1);
  // the threshold input holds the base, so the bonus is spelled out separately.
  const optionBonus = optionTargetModifier(values, composedFields);

  // A selected scenario imposes a fixed win target (read-only), raised by the
  // options and any active extension modifiers; it overrides the editable
  // threshold field.
  const scenarioBase = scenarioTarget(active, scenarioByExt);
  const lockedTarget = winTargetWithModifiers(
    scenarioBase === null ? null : scenarioBase + optionBonus,
    active,
  );

  const thresholdField =
    boardgame.scoring?.winCondition.type === "threshold"
      ? boardgame.scoring.winCondition.field
      : null;
  const thresholdSpec =
    thresholdField != null
      ? (composedFields.find(f => f.key === thresholdField) ?? null)
      : null;
  const editableFields = composedFields.filter(f => f.key !== thresholdField);

  function pickScenario(extension: ExtensionId, id: ExtensionScenarioId) {
    setScenarioByExt(prev => ({ ...prev, [extension]: id }));
  }

  function toggleExtension(id: ExtensionId) {
    setSelectedExt(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  }

  function setField(key: string, value: unknown) {
    setValues(prev => ({ ...(prev ?? {}), [key]: value }));
  }

  /** Only reachable from the editable target bar, which needs the field. */
  function setTarget(value: number | undefined) {
    if (thresholdField != null) {
      setField(thresholdField, value);
    }
  }

  function confirmLaunch(snapshot: ConfigValues | null) {
    requestConfirm({
      message: "Tout est prêt ? La partie va démarrer.",
      confirmLabel: "Lancer",
      details:
        fogZones.length > 0 ? (
          <HiddenMaterial zones={fogZones} className={fogDetailsClass} />
        ) : undefined,
      onConfirm: () => onLaunch(snapshot, selectedExt, scenarioByExt),
    });
  }

  /**
   * What a checked-out recap leads to: the board to set up when the game is
   * played on one, the confirmation itself otherwise.
   */
  function proceed(snapshot: ConfigValues | null) {
    if (board === null) {
      confirmLaunch(snapshot);

      return;
    }

    setReady({ values: snapshot });
  }

  function handleLaunch() {
    // A scenario-based extension needs its scenario chosen.
    if (active.some(e => e.hasScenarios && !scenarioByExt[e.id])) {
      setInvalid(
        "Choisis un scénario pour chaque extension qui en demande un.",
      );

      return;
    }

    // No template → nothing to snapshot; carry on with no values at all.
    if (!template) {
      proceed(null);

      return;
    }

    const parsed = validateConfigValues(composedFields, values ?? {});
    if (!parsed.success) {
      setInvalid("Vérifie les attributs de la partie avant de lancer.");

      return;
    }

    setInvalid(null);
    proceed(parsed.data);
  }

  const targetValue =
    thresholdField != null && typeof values?.[thresholdField] === "number"
      ? (values[thresholdField] as number)
      : "";

  const boostedOptions = composedFields.filter(
    (f): f is BooleanFieldSpec =>
      f.type === "boolean" &&
      (f.targetModifier ?? 0) > 0 &&
      values?.[f.key] === true,
  );

  // The bar shows the target the options actually add up to; the field itself
  // only holds the base, so the sum is spelled out rather than silently applied.
  const bonus =
    optionBonus > 0 && typeof targetValue === "number"
      ? {
          label: boostedOptions
            .map(f => `+${f.targetModifier} ${f.label}`)
            .join(" · "),
          total: targetValue + optionBonus,
        }
      : null;
  const showTarget = lockedTarget !== null || thresholdSpec !== null;

  if (ready !== null && board !== null) {
    return (
      <>
        <BoardStep
          board={board}
          creating={creating}
          error={error}
          onBack={() => setReady(null)}
          onValidate={() => confirmLaunch(ready.values)}
        />
        {confirmDialog}
      </>
    );
  }

  return (
    <FunnelStep
      title={
        board === null
          ? "4 · Vérifie et lance la partie"
          : "4 · Vérifie la partie"
      }
      onBack={onBack}
      footer={
        loading ? null : (
          <>
            {showTarget ? (
              <WinTargetBar
                locked={lockedTarget}
                note={`Imposé par le scénario${
                  active.some(e => e.targetModifier > 0) || optionBonus > 0
                    ? " (relevé par les options et extensions actives)"
                    : ""
                }.`}
                value={targetValue}
                min={
                  thresholdSpec && "min" in thresholdSpec
                    ? thresholdSpec.min
                    : undefined
                }
                max={
                  thresholdSpec && "max" in thresholdSpec
                    ? thresholdSpec.max
                    : undefined
                }
                bonus={bonus}
                onChange={setTarget}
              />
            ) : null}

            <ErrorText message={invalid} />
            <ErrorText message={error} />

            <button
              type="button"
              disabled={creating}
              onClick={handleLaunch}
              className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
            >
              {creating ? "Création…" : launchLabel}
            </button>
          </>
        )
      }
    >
      {loading ? (
        <p className="text-sm text-zinc-500">Chargement…</p>
      ) : (
        <>
          <RecapSummary
            boardgameName={boardgame.name}
            config={config}
            players={players}
            simultaneous={simultaneous}
            onDrawFirstPlayer={() => setWheelOpen(true)}
          />

          {extensions.length > 0 ? (
            <ExtensionPicker
              extensions={extensions}
              selected={selectedExt}
              scenarioByExtension={scenarioByExt}
              players={players.length}
              onToggle={toggleExtension}
              onPickScenario={pickScenario}
            />
          ) : null}

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

          {confirmDialog}
          {wheelOpen ? (
            <FirstPlayerWheel
              players={players}
              onResult={ordered => {
                onReorderPlayers(ordered);
                setWheelOpen(false);
              }}
              onClose={() => setWheelOpen(false)}
            />
          ) : null}
        </>
      )}
    </FunnelStep>
  );
}
