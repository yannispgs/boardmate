"use client";

import { type ReactNode, useEffect, useState } from "react";
import { ConfigField } from "@/components/ConfigField";
import { HiddenMaterial } from "@/components/catan/HiddenMaterial";
import { ErrorText } from "@/components/ErrorText";
import { useConfirm } from "@/components/use-confirm";
import { hiddenMaterial } from "@/lib/catan/hidden-material";
import { buildDefaults, validateConfigValues } from "@/lib/config/validation";
import type {
  Boardgame,
  Config,
  ConfigValues,
  ExtensionId,
  ExtensionScenarioId,
  GameStage,
  Player,
} from "@/lib/domain";
import { composeConfigFields, composeGoals } from "@/lib/game/extensions";
import { funnelBoard } from "@/lib/game/funnel-board";
import { type StagePick, stageCalendar } from "@/lib/game/stage";
import { type WinTargetView, winTargetView } from "@/lib/game/win-target";
import { useConfigs } from "@/lib/hooks/use-configs";
import { useExtensions } from "@/lib/hooks/use-extensions";
import { BoardStep } from "./BoardStep";
import { ExtensionPicker } from "./ExtensionPicker";
import { FirstPlayerWheel } from "./FirstPlayerWheel";
import { FunnelStep } from "./FunnelStep";
import { RecapSummary } from "./RecapSummary";
import { StageGoalsStep } from "./StageGoalsStep";
import { WinTargetBar } from "./WinTargetBar";

/** The fog's preparation list, framed to sit inside the launch confirmation. */
const fogDetailsClass =
  "flex flex-col gap-3 rounded-lg border border-black/10 p-3 text-left dark:border-white/10";

/**
 * The funnel's last step: everything the game is about to start with, laid out
 * one more time — players, extensions, tunable attributes and the score to
 * reach — then the launch itself. Games played on a board get one extra step
 * (drawing it) between the recap checking out and the confirmation.
 */
export function RecapStep({
  boardgame,
  config,
  players,
  creating,
  error,
  onBack,
  onReorderPlayers,
  onLaunch,
}: Readonly<{
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
    stages: GameStage[],
  ) => void;
}>) {
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
  // Which of the post-recap steps is on screen, once the recap checks out.
  const [extraStep, setExtraStep] = useState(0);
  // The goal tiles laid on the board, one per manche (Wingspan).
  const [picks, setPicks] = useState<StagePick[]>([]);
  // Selected extensions and, per scenario-based one, the chosen scenario.
  const [selectedExt, setSelectedExt] = useState<ExtensionId[]>([]);
  const [scenarioByExt, setScenarioByExt] = useState<
    Record<ExtensionId, ExtensionScenarioId>
  >({});

  const active = extensions.filter(e => selectedExt.includes(e.id));
  // Config fields composed with the active extensions (fields merged by key).
  const composedFields = composeConfigFields(template?.fields ?? [], active);

  // The board this game will be set up on, once it is settled enough to draw
  // one — null for a game the app has no board to offer, which launches from
  // the recap as it always did.
  const board = funnelBoard(boardgame, active, scenarioByExt, players.length);

  // Games played on a calendar (Wingspan) have their goal tiles drawn at setup:
  // the length of every manche depends on them, so they are asked for before
  // anybody sits down — and after the recap, since an extension brings its own.
  const stageSpec = boardgame.stages;
  const schedule =
    stageSpec?.advance === "schedule" ? (stageSpec.schedule ?? []) : [];
  const goalTiles = composeGoals(boardgame.roundGoals, active);
  const needsGoals = schedule.length > 0 && goalTiles.length > 0;
  const calendar = needsGoals ? stageCalendar(schedule, picks, goalTiles) : [];

  // What still stands between a checked-out recap and the first turn, in order.
  const afterRecap = (
    [
      board === null ? null : ("board" as const),
      needsGoals ? ("goals" as const) : null,
    ] as const
  ).filter(step => step !== null);

  const target = winTargetView(
    boardgame.scoring?.winCondition ?? null,
    composedFields,
    values,
    active,
    scenarioByExt,
  );
  const editableFields = composedFields.filter(f => f.key !== target.field);

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
      setValues({ ...buildDefaults(fields), ...config?.values });
    }
  }, [template, config, extensions, selectedExt]);

  function setField(key: string, value: unknown) {
    setValues(prev => ({ ...prev, [key]: value }));
  }

  function confirmLaunch(snapshot: ConfigValues | null) {
    // A map that keeps tiles face down needs a pile taken out of the box first,
    // and the confirmation is the last moment anyone reads before playing.
    const fogZones =
      board?.kind === "scenario" ? hiddenMaterial(board.board) : [];

    requestConfirm({
      message: "Tout est prêt ? La partie va démarrer.",
      confirmLabel: "Lancer",
      details:
        fogZones.length > 0 ? (
          <HiddenMaterial zones={fogZones} className={fogDetailsClass} />
        ) : undefined,
      onConfirm: () => onLaunch(snapshot, selectedExt, scenarioByExt, calendar),
    });
  }

  function handleLaunch() {
    const snapshot = validatedSnapshot();
    if (snapshot === null) {
      return;
    }

    setInvalid(null);
    setReady({ values: snapshot.values });
    setExtraStep(0);

    // A recap with nothing left to settle leads straight to the confirmation.
    if (afterRecap.length === 0) {
      confirmLaunch(snapshot.values);
    }
  }

  /** Leaves a post-recap step: on to the next one, or to the launch itself. */
  function stepOn(values: ConfigValues | null) {
    const next = extraStep + 1;

    if (next >= afterRecap.length) {
      confirmLaunch(values);

      return;
    }

    setExtraStep(next);
  }

  /** Backs out of a post-recap step: to the previous one, or to the recap. */
  function stepBack() {
    if (extraStep === 0) {
      setReady(null);

      return;
    }

    setExtraStep(extraStep - 1);
  }

  /**
   * The values to launch with, or null once the reason not to has been shown.
   * Wrapped rather than returned bare, since "no values at all" is a valid
   * snapshot for a game with no config template.
   */
  function validatedSnapshot(): { values: ConfigValues | null } | null {
    // A scenario-based extension needs its scenario chosen.
    if (active.some(e => e.hasScenarios && !scenarioByExt[e.id])) {
      setInvalid(
        "Choisis un scénario pour chaque extension qui en demande un.",
      );

      return null;
    }

    // No template → nothing to snapshot; carry on with no values at all.
    if (!template) {
      return { values: null };
    }

    const parsed = validateConfigValues(composedFields, values ?? {});
    if (!parsed.success) {
      setInvalid("Vérifie les attributs de la partie avant de lancer.");

      return null;
    }

    return { values: parsed.data };
  }

  const onScreen = ready === null ? null : (afterRecap[extraStep] ?? null);

  if (ready !== null && onScreen === "board" && board !== null) {
    return (
      <>
        <BoardStep
          board={board}
          creating={creating}
          error={error}
          onBack={stepBack}
          onValidate={() => stepOn(ready.values)}
        />
        {confirmDialog}
      </>
    );
  }

  if (ready !== null && onScreen === "goals") {
    return (
      <>
        <StageGoalsStep
          stageLabel={stageSpec?.label ?? "Manche"}
          schedule={schedule}
          catalogue={goalTiles}
          picks={picks}
          creating={creating}
          error={error}
          onPicks={setPicks}
          onBack={stepBack}
          onValidate={() => stepOn(ready.values)}
        />
        {confirmDialog}
      </>
    );
  }

  return (
    <FunnelStep
      title={
        afterRecap.length === 0
          ? "4 · Vérifie et lance la partie"
          : "4 · Vérifie la partie"
      }
      onBack={onBack}
      footer={
        <RecapFooter
          loading={loading}
          target={target}
          invalid={invalid}
          error={error}
          creating={creating}
          // A board to draw or tiles to lay means one more step before the game
          // actually starts.
          launchLabel={recapActionLabel(afterRecap[0] ?? null)}
          onChangeTarget={value => {
            if (target.field !== null) {
              setField(target.field, value);
            }
          }}
          onLaunch={handleLaunch}
        />
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
            // Simultaneous games have no turn order → no numbered list, no
            // first player.
            simultaneous={boardgame.turnMode === "simultaneous"}
            onDrawFirstPlayer={() => setWheelOpen(true)}
          />

          {extensions.length > 0 ? (
            <ExtensionPicker
              extensions={extensions}
              selected={selectedExt}
              scenarioByExtension={scenarioByExt}
              players={players.length}
              onToggle={id => {
                setSelectedExt(prev =>
                  prev.includes(id)
                    ? prev.filter(x => x !== id)
                    : [...prev, id],
                );
              }}
              onPickScenario={(extension, id) => {
                setScenarioByExt(prev => ({ ...prev, [extension]: id }));
              }}
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

/** What the recap's button promises: the launch, or the step it opens onto. */
function recapActionLabel(next: "board" | "goals" | null): string {
  if (next === "board") {
    return "Choisis le plateau →";
  }

  if (next === "goals") {
    return "Choix des objectifs →";
  }

  return "Lancer la partie";
}

/** The score to reach, whatever is blocking the launch, and the launch button. */
function RecapFooter({
  loading,
  target,
  invalid,
  error,
  creating,
  launchLabel,
  onChangeTarget,
  onLaunch,
}: Readonly<{
  loading: boolean;
  target: WinTargetView;
  invalid: string | null;
  error: string | null;
  creating: boolean;
  launchLabel: string;
  onChangeTarget: (value: number | undefined) => void;
  onLaunch: () => void;
}>): ReactNode {
  if (loading) {
    return null;
  }

  return (
    <>
      {target.bar ? (
        <WinTargetBar {...target.bar} onChange={onChangeTarget} />
      ) : null}

      <ErrorText message={invalid} />
      <ErrorText message={error} />

      <button
        type="button"
        disabled={creating}
        onClick={onLaunch}
        className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
      >
        {creating ? "Création…" : launchLabel}
      </button>
    </>
  );
}
