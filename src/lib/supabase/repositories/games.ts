import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  BoardgameId,
  ConfigId,
  ConfigValues,
  ExtensionScenarioId,
  FieldSpec,
  Game,
  GameId,
  GameListItem,
  GamePlayer,
  GameStatsRecord,
  GameStatus,
  GameTurn,
  GameTurnId,
  NewFinishedGame,
  NewGame,
  Player,
  PlayerId,
  PopulatedGame,
  TieBreakRecord,
  TurnMode,
} from "@/lib/domain";
import {
  composeScoring,
  orderPlayed,
  scenarioTarget,
  winTargetWithModifiers,
} from "@/lib/game/extensions";
import { activeSeat, generationOver } from "@/lib/game/generation";
import { optionTargetModifier, winThresholdFrom } from "@/lib/game/scoring";
import { advanceTurn as nextTurnState } from "@/lib/game/turn";
import { turnScheduleFrom } from "@/lib/game/turn-schedule";
import type { GameRepository, Unsubscribe } from "@/lib/repositories/types";
import type { Database, Json } from "@/lib/supabase/database.types";
import { toBoardgame } from "@/lib/supabase/repositories/boardgames";
import { toConfig } from "@/lib/supabase/repositories/configs";
import { toExtension } from "@/lib/supabase/repositories/extensions";
import { toPlayer } from "@/lib/supabase/repositories/players";

type GameRow = Database["public"]["Tables"]["games"]["Row"];
type BoardgameRow = Database["public"]["Tables"]["boardgames"]["Row"];
type ConfigRow = Database["public"]["Tables"]["configs"]["Row"];
type PlayerRow = Database["public"]["Tables"]["players"]["Row"];
type GameTurnRow = Database["public"]["Tables"]["game_turns"]["Row"];
type ExtensionRow = Database["public"]["Tables"]["extensions"]["Row"];
type ScenarioRow = Database["public"]["Tables"]["extension_scenarios"]["Row"];

function toGame(row: GameRow): Game {
  return {
    id: row.id as GameId,
    boardgameId: row.boardgame_id as BoardgameId,
    configId: (row.config_id as ConfigId | null) ?? null,
    configValues: (row.config_values as ConfigValues | null) ?? null,
    status: row.status as GameStatus,
    round: row.round,
    turn: row.turn,
    stage: row.stage,
    /* c8 ignore next -- defensive `?? null`; the cast value is already nullable */
    currentPlayerId: (row.current_player_id as PlayerId | null) ?? null,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    tieBreak: (row.tie_break as TieBreakRecord | null) ?? null,
  };
}

// Shape returned by the games-list select (game + its participants, with the
// player name embedded).
type GameListRow = GameRow & {
  game_players: Array<{
    seat_order: number;
    is_winner: boolean;
    score: number | null;
    player: { id: string; name: string };
  }>;
  game_extensions: Array<{
    extension: { name: string; sort_order: number };
    scenario: { name: string } | null;
  }>;
};

function toGameListItem(row: GameListRow): GameListItem {
  const players = [...row.game_players]
    .sort((a, b) => a.seat_order - b.seat_order)
    .map(gp => ({
      id: gp.player.id as PlayerId,
      name: gp.player.name,
      isWinner: gp.is_winner,
      score: gp.score,
    }));
  // Only the two names are pulled here: the list says what a game was played
  // with, it doesn't replay what the extension did to it.
  const extensions = orderPlayed(
    row.game_extensions.map(ge => ({
      name: ge.extension.name,
      scenarioName: ge.scenario?.name ?? null,
      sortOrder: ge.extension.sort_order,
    })),
  );

  return { ...toGame(row), players, extensions };
}

function toGameTurn(row: GameTurnRow): GameTurn {
  return {
    id: row.id as GameTurnId,
    gameId: row.game_id as GameId,
    // Null for a simultaneous round (no single owner).
    playerId: (row.player_id as PlayerId | null) ?? null,
    /* c8 ignore next -- `?? null` guards a backend without the column yet */
    blockedById: (row.blocked_by_player_id as PlayerId | null) ?? null,
    /* c8 ignore next -- `?? 0` guards a backend without the column yet */
    waitedS: row.waited_s ?? 0,
    round: row.round,
    turnNo: row.turn_no,
    // Null on every lap-based game, which has no generation to record.
    stage: row.stage,
    durationS: row.duration_s,
    // `?? 0` guards a not-yet-migrated backend that omits the pause/overtime
    // columns (defensive, unreachable once the columns exist), so stats never
    // see NaN.
    /* c8 ignore start */
    pauseCount: row.pause_count ?? 0,
    pauseDurationS: row.pause_duration_s ?? 0,
    overtimeS: row.overtime_s ?? 0,
    /* c8 ignore stop */
  };
}

// Shape returned by the lightweight `listStats` select (one row per ended game).
type StatsRow = {
  id: string;
  boardgame_id: string;
  ended_at: string | null;
  boardgame: { name: string; dice: unknown } | null;
  game_players: Array<{
    player_id: string;
    seat_order: number;
    is_winner: boolean;
    score: number | null;
    score_breakdown: Record<string, number> | null;
    player: { name: string } | null;
  }>;
  game_turns: Array<{
    player_id: string;
    round: number;
    duration_s: number;
    pause_duration_s: number | null;
    overtime_s: number | null;
  }>;
  dice_rolls: Array<{ value: number; created_at: string }>;
};

function toStatsRecord(row: StatsRow): GameStatsRecord {
  return {
    gameId: row.id as GameId,
    boardgameId: row.boardgame_id as BoardgameId,
    /* c8 ignore next -- `?? ""` guards a boardgame row that can't be missing (FK) */
    boardgameName: row.boardgame?.name ?? "",
    dice: (row.boardgame?.dice as GameStatsRecord["dice"]) ?? null,
    endedAt: row.ended_at,
    players: row.game_players.map(gp => ({
      playerId: gp.player_id as PlayerId,
      /* c8 ignore next -- `?? "?"` guards a player row that can't be missing (FK) */
      name: gp.player?.name ?? "?",
      seatOrder: gp.seat_order,
      isWinner: gp.is_winner,
      score: gp.score,
      scoreBreakdown: gp.score_breakdown ?? null,
    })),
    turns: row.game_turns.map(t => ({
      playerId: t.player_id as PlayerId,
      round: t.round,
      durationS: t.duration_s,
      // `?? 0` guards a not-yet-migrated backend missing the columns.
      /* c8 ignore start */
      pauseDurationS: t.pause_duration_s ?? 0,
      overtimeS: t.overtime_s ?? 0,
      /* c8 ignore stop */
    })),
    diceRolls: [...row.dice_rolls]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map(d => d.value),
  };
}

// Shape returned by the nested `getPopulated` select.
type PopulatedRow = GameRow & {
  // The boardgame plus its config template's fields (for the win threshold's
  // default). One-to-one relation → PostgREST embeds a single object (or null).
  boardgame: BoardgameRow & { config_templates: { fields: unknown } | null };
  config: ConfigRow | null;
  game_players: Array<{
    game_id: string;
    player_id: string;
    seat_order: number;
    is_winner: boolean;
    score: number | null;
    score_breakdown: Record<string, number> | null;
    player: PlayerRow;
  }>;
  game_turns: GameTurnRow[];
  game_extensions: Array<{
    extension_id: string;
    scenario_id: string | null;
    extension: ExtensionRow & { extension_scenarios: ScenarioRow[] };
  }>;
  score_events: Array<{
    player_id: string;
    score: number;
    round: number;
    created_at: string;
  }>;
  dice_rolls: Array<{ value: number; created_at: string }>;
  game_stage_passes: Array<{ player_id: string; stage: number }>;
};

const POPULATED_SELECT =
  "*, boardgame:boardgames(*, config_templates(fields)), config:configs(*), " +
  "game_players(*, player:players(*)), game_turns(*), " +
  "game_extensions(extension_id, scenario_id, " +
  "extension:extensions(*, extension_scenarios(*))), " +
  "score_events(player_id, score, round, created_at), " +
  "dice_rolls(value, created_at), " +
  "game_stage_passes(player_id, stage)";

/** Where a game stands once the turn that just ended has been recorded. */
interface NextTurn {
  turn: number;
  round: number;
  stage: number;
  playerId: string | null;
}

/** The turn state `advanceTurn` reads before rotating. */
type TurnState = Pick<
  GameRow,
  "round" | "turn" | "stage" | "current_player_id"
>;

type Seat = { player_id: string };

/** The passed-seat set a freshly opened generation starts from. */
const NOBODY_PASSED: ReadonlySet<number> = new Set();

/** Everything the turn that just ended has to be written down with. */
interface FinishedTurn {
  elapsedSeconds: number;
  pauseCount: number;
  pauseDurationSeconds: number;
  overtimeSeconds: number;
  simultaneous: boolean;
  generations: boolean;
  /** Simultaneous games only: who the table was waiting on, if anybody. */
  blockedById: PlayerId | null;
  waitedS: number | null;
}

/**
 * Logs the turn that just ended. A simultaneous round is one shared turn owned
 * by nobody — naming instead the player the table waited on — where a sequential
 * turn belongs to whoever was up.
 */
async function recordTurn(
  supabase: SupabaseClient<Database>,
  id: GameId,
  game: TurnState,
  turn: FinishedTurn,
): Promise<void> {
  /* c8 ignore next 3 -- a live sequential game always has a current player */
  if (!turn.simultaneous && !game.current_player_id) {
    return;
  }

  const { error } = await supabase.from("game_turns").insert({
    game_id: id,
    player_id: turn.simultaneous ? null : game.current_player_id,
    blocked_by_player_id: turn.simultaneous ? turn.blockedById : null,
    waited_s: turn.waitedS,
    round: game.round,
    turn_no: game.turn,
    // The generation this turn belongs to, for the per-generation stats.
    stage: turn.generations ? game.stage : null,
    duration_s: Math.max(0, Math.round(turn.elapsedSeconds)),
    pause_count: Math.max(0, Math.round(turn.pauseCount)),
    pause_duration_s: Math.max(0, Math.round(turn.pauseDurationSeconds)),
    overtime_s: Math.max(0, Math.round(turn.overtimeSeconds)),
  });

  /* c8 ignore next 3 -- defensive guard: insert errors surface via e2e */
  if (error) {
    throw new Error(`Enregistrement du tour: ${error.message}`);
  }
}

/**
 * Where a lap-based game moves to: the rotation is pure arithmetic on the turn
 * counter (`@/lib/game/turn`), and the generation is left alone since the game
 * has none.
 */
function lapTurn(
  game: TurnState,
  seats: Seat[],
  next: { turn: number; round: number; seatIndex: number },
  simultaneous: boolean,
): NextTurn {
  return {
    turn: next.turn,
    round: next.round,
    stage: game.stage,
    // Simultaneous games have no current player.
    /* c8 ignore next -- defensive `?.`/`?? null`; seat index is in range */
    playerId: simultaneous ? null : (seats[next.seatIndex]?.player_id ?? null),
  };
}

/**
 * Where a game played in generations moves to. Records the pass first, when the
 * player who just played is stepping out, then hands over to the next seat
 * still in — or, once that pass was the last one, opens the next generation on
 * its first-player marker with everybody back in.
 */
async function nextGenerationTurn(
  supabase: SupabaseClient<Database>,
  id: GameId,
  game: TurnState,
  seats: Seat[],
  passing: boolean,
): Promise<NextTurn> {
  /* c8 ignore next -- a live sequential game always has a current player */
  if (passing && game.current_player_id) {
    const { error } = await supabase.from("game_stage_passes").insert({
      game_id: id,
      player_id: game.current_player_id,
      stage: game.stage,
    });
    /* c8 ignore next 3 -- defensive guard: insert errors surface via e2e */
    if (error) {
      throw new Error(`Enregistrement du passage: ${error.message}`);
    }
  }

  const { data: passes, error: passesError } = await supabase
    .from("game_stage_passes")
    .select("player_id")
    .eq("game_id", id)
    .eq("stage", game.stage);
  /* c8 ignore next 3 -- defensive guard: a healthy select doesn't error */
  if (passesError) {
    throw new Error(`Lecture des passages: ${passesError.message}`);
  }

  // Seats are read in seat order, so a player's index *is* his seat.
  const passedIds = new Set(passes.map(p => p.player_id));
  const passedSeats = new Set(
    seats.flatMap((s, seat) => (passedIds.has(s.player_id) ? [seat] : [])),
  );
  const currentSeat = seats.findIndex(
    s => s.player_id === game.current_player_id,
  );

  // The generation ends the moment its last player passes: the table moves on
  // to the next one and everybody is back in.
  const over = generationOver(seats.length, passedSeats);
  const stage = over ? game.stage + 1 : game.stage;
  const seat = activeSeat(
    stage,
    seats.length,
    over ? null : currentSeat,
    over ? NOBODY_PASSED : passedSeats,
  );

  return {
    turn: game.turn + 1,
    // Laps stop meaning anything once players start dropping out, so the round
    // follows the generation — it is what the turn timer and the score log read.
    round: stage,
    stage,
    /* c8 ignore next 2 -- defensive: a reopened generation always has a seat */
    playerId: seat === null ? null : (seats[seat]?.player_id ?? null),
  };
}

/**
 * Supabase-backed `GameRepository`. The only place the Supabase SDK touches
 * games / participations / turn logs. Turn rotation itself is pure domain
 * logic (`@/lib/game/turn`); this adapter only persists its results.
 */
export function createGameRepository(
  supabase: SupabaseClient<Database>,
): GameRepository {
  const games = () => supabase.from("games");

  return {
    async list(filter?: { status?: GameStatus }) {
      const status = filter?.status ?? "ongoing";
      const { data, error } = await games()
        .select(
          "*, game_players(seat_order, is_winner, score, player:players(id, name))" +
            ", game_extensions(extension:extensions(name, sort_order)" +
            ", scenario:extension_scenarios(name))",
        )
        .eq("status", status)
        .order("started_at", { ascending: false });
      /* c8 ignore next 3 -- defensive guard: a healthy select doesn't error */
      if (error) {
        throw new Error(`Lecture des parties: ${error.message}`);
      }

      return (data as unknown as GameListRow[]).map(toGameListItem);
    },

    async listStats() {
      const { data, error } = await games()
        .select(
          "id, boardgame_id, ended_at, boardgame:boardgames(name, dice), " +
            "game_players(player_id, seat_order, is_winner, score, score_breakdown, player:players(name)), " +
            "game_turns(player_id, round, duration_s, pause_duration_s, overtime_s), " +
            "dice_rolls(value, created_at)",
        )
        .eq("status", "ended");
      /* c8 ignore next 3 -- defensive guard: a healthy select doesn't error */
      if (error) {
        throw new Error(`Lecture des statistiques: ${error.message}`);
      }

      return (data as unknown as StatsRow[]).map(toStatsRecord);
    },

    async getPopulated(id: GameId) {
      const { data, error } = await games()
        .select(POPULATED_SELECT)
        .eq("id", id)
        .maybeSingle();
      if (error) {
        throw new Error(`Lecture de la partie: ${error.message}`);
      }
      if (!data) {
        return null;
      }
      const row = data as unknown as PopulatedRow;

      const players = [...row.game_players]
        .sort((a, b) => a.seat_order - b.seat_order)
        .map(gp => ({
          gameId: gp.game_id as GameId,
          playerId: gp.player_id as PlayerId,
          seatOrder: gp.seat_order,
          isWinner: gp.is_winner,
          score: gp.score,
          scoreBreakdown: gp.score_breakdown ?? null,
          player: toPlayer(gp.player),
        })) satisfies Array<GamePlayer & { player: Player }>;

      const boardgame = toBoardgame(row.boardgame);
      const config = row.config ? toConfig(row.config) : null;
      const templateFields = (row.boardgame.config_templates?.fields ??
        []) as unknown as FieldSpec[];

      // Active extensions, with the scenario chosen for each. Their scoresheet
      // additions compose onto the base scoring.
      const extensions = row.game_extensions.map(ge => ({
        ...toExtension(ge.extension),
        scenarioId: ge.scenario_id as ExtensionScenarioId | null,
      }));
      const scoring = composeScoring(boardgame.scoring, extensions);
      boardgame.scoring = scoring;

      // The game's own snapshot (tweaked at the recap) wins over the source
      // config's values, which win over the template default.
      const effectiveValues =
        (row.config_values as ConfigValues | null) ?? config?.values ?? null;
      // The win target: a selected scenario imposes its base (over the config),
      // then the options switched on and the active extensions' modifiers raise
      // it (never lower).
      const scenarioBy = Object.fromEntries(
        extensions.flatMap(e =>
          e.scenarioId ? [[e.id, e.scenarioId] as const] : [],
        ),
      );
      const baseTarget =
        scenarioTarget(extensions, scenarioBy) ??
        (scoring
          ? winThresholdFrom(
              scoring.winCondition,
              effectiveValues,
              templateFields,
            )
          : null);
      const optionBonus = optionTargetModifier(effectiveValues, templateFields);
      const winThreshold = winTargetWithModifiers(
        baseTarget === null ? null : baseTarget + optionBonus,
        extensions,
      );
      const turnSchedule = turnScheduleFrom(effectiveValues, templateFields);

      const scoreEvents = [...row.score_events]
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map(e => ({
          playerId: e.player_id as PlayerId,
          score: e.score,
          round: e.round,
          at: e.created_at,
        }));

      const diceRolls = [...row.dice_rolls]
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map(d => ({ value: d.value, at: d.created_at }));

      const stagePasses = [...row.game_stage_passes]
        .sort((a, b) => a.stage - b.stage)
        .map(p => ({ playerId: p.player_id as PlayerId, stage: p.stage }));

      const populated: PopulatedGame = {
        ...toGame(row),
        boardgame,
        config,
        winThreshold,
        turnSchedule,
        extensions,
        scoreEvents,
        diceRolls,
        players,
        /* c8 ignore next 2 -- `?? null` fallback for a current player not found */
        currentPlayer:
          players.find(p => p.playerId === row.current_player_id)?.player ??
          null,
        turns: row.game_turns.map(toGameTurn),
        stagePasses,
      };
      return populated;
    },

    async create(input: NewGame) {
      const { data: game, error } = await games()
        .insert({
          boardgame_id: input.boardgameId,
          config_id: input.configId,
          config_values: (input.configValues ?? null) as Json,
          current_player_id: input.playerIds[0] ?? null,
          round: 1,
          turn: 1,
          status: "ongoing",
        })
        .select("*")
        .single();
      if (error) {
        throw new Error(`Création de la partie: ${error.message}`);
      }

      const rows = input.playerIds.map((playerId, index) => ({
        game_id: game.id,
        player_id: playerId,
        seat_order: index,
        is_winner: false,
        // Seed live-scored games at the starting score so no player is ever left
        // unscored; final-scored / unscored games stay null (entered at the end).
        score: input.initialScore ?? null,
      }));
      const { error: gpError } = await supabase
        .from("game_players")
        .insert(rows);
      if (gpError) {
        throw new Error(`Ajout des joueurs: ${gpError.message}`);
      }

      const extensionIds = input.extensionIds ?? [];

      if (extensionIds.length > 0) {
        const byExt = input.scenarioByExtension ?? {};
        const extRows = extensionIds.map(extensionId => ({
          game_id: game.id,
          extension_id: extensionId,
          scenario_id: byExt[extensionId] ?? null,
        }));
        const { error: geError } = await supabase
          .from("game_extensions")
          .insert(extRows);
        if (geError) {
          throw new Error(`Ajout des extensions: ${geError.message}`);
        }
      }

      return toGame(game);
    },

    async createFinished(input: NewFinishedGame) {
      const { data: game, error } = await games()
        .insert({
          boardgame_id: input.boardgameId,
          config_id: null,
          config_values: null,
          current_player_id: null,
          round: 1,
          turn: 1,
          status: "ended",
          ended_at: input.endedAt,
          // A shared victory entered after the fact has no rule trail, but the
          // score recap still needs to know the game ended on an ex æquo.
          tie_break: (input.winnerIds.length > 1
            ? { tied: input.winnerIds, steps: [], shared: true }
            : null) as Json,
        })
        .select("*")
        .single();
      if (error) {
        throw new Error(`Création de la partie terminée: ${error.message}`);
      }

      const rows = input.players.map(p => ({
        game_id: game.id,
        player_id: p.playerId,
        seat_order: p.seatOrder,
        is_winner: input.winnerIds.includes(p.playerId),
        score: p.score === null ? null : Math.round(p.score),
        score_breakdown: (p.breakdown ?? null) as Json,
      }));
      const { error: gpError } = await supabase
        .from("game_players")
        .insert(rows);
      if (gpError) {
        throw new Error(`Ajout des joueurs: ${gpError.message}`);
      }
      return toGame(game);
    },

    async remove(id: GameId) {
      // Turns / players / scores / dice cascade from the games row's FKs.
      const { error } = await games().delete().eq("id", id);
      if (error) {
        throw new Error(`Suppression de la partie: ${error.message}`);
      }
    },

    async advanceTurn(
      id: GameId,
      elapsedSeconds: number,
      pauseCount: number,
      pauseDurationSeconds: number,
      overtimeSeconds: number,
      opts?: {
        turnMode?: TurnMode;
        blockedById?: PlayerId | null;
        waitedSeconds?: number;
        generations?: boolean;
        passing?: boolean;
      },
    ) {
      const simultaneous = opts?.turnMode === "simultaneous";
      const generations = opts?.generations === true;
      const blockedById = opts?.blockedById ?? null;
      const waitedS =
        simultaneous && blockedById !== null
          ? Math.max(0, Math.round(opts?.waitedSeconds ?? 0))
          : null;

      const { data: game, error } = await games()
        .select("round, turn, stage, current_player_id")
        .eq("id", id)
        .single();
      if (error) {
        throw new Error(`Lecture de la partie: ${error.message}`);
      }

      const { data: seats, error: seatsError } = await supabase
        .from("game_players")
        .select("player_id, seat_order")
        .eq("game_id", id)
        .order("seat_order", { ascending: true });
      /* c8 ignore next 3 -- defensive guard: a healthy select doesn't error */
      if (seatsError) {
        throw new Error(`Lecture des joueurs: ${seatsError.message}`);
      }

      // A simultaneous round is one shared turn per round (no owner, optional
      // "waited on" player); a sequential turn is one per seat.
      const perRound = simultaneous ? 1 : seats.length;

      await recordTurn(supabase, id, game, {
        elapsedSeconds,
        pauseCount,
        pauseDurationSeconds,
        overtimeSeconds,
        simultaneous,
        generations,
        blockedById,
        waitedS,
      });

      const next = generations
        ? await nextGenerationTurn(
            supabase,
            id,
            game,
            seats,
            opts?.passing === true,
          )
        : lapTurn(
            game,
            seats,
            nextTurnState(game.turn, perRound),
            simultaneous,
          );

      const { error: updateError } = await games()
        .update({
          turn: next.turn,
          round: next.round,
          stage: next.stage,
          current_player_id: next.playerId,
        })
        .eq("id", id);
      /* c8 ignore next 3 -- defensive guard: update errors surface via e2e */
      if (updateError) {
        throw new Error(`Mise à jour du tour: ${updateError.message}`);
      }
    },

    async setScore(
      id: GameId,
      playerId: PlayerId,
      score: number,
      round: number,
    ) {
      const rounded = Math.round(score);
      const { error } = await supabase
        .from("game_players")
        .update({ score: rounded })
        .eq("game_id", id)
        .eq("player_id", playerId);
      /* c8 ignore next 3 -- defensive guard: update errors surface via e2e */
      if (error) {
        throw new Error(`Enregistrement du score: ${error.message}`);
      }

      // Append to the score history (for the evolution timeline), tagged with
      // the tour it happened in.
      const { error: eventError } = await supabase
        .from("score_events")
        .insert({ game_id: id, player_id: playerId, score: rounded, round });
      /* c8 ignore next 3 -- defensive guard: insert errors surface via e2e */
      if (eventError) {
        throw new Error(`Historique du score: ${eventError.message}`);
      }
    },

    async addDiceRoll(id: GameId, value: number) {
      const { error } = await supabase
        .from("dice_rolls")
        .insert({ game_id: id, value });
      /* c8 ignore next 3 -- defensive guard: insert errors surface via e2e */
      if (error) {
        throw new Error(`Enregistrement du lancer: ${error.message}`);
      }
    },

    async end(id: GameId, winnerIds: PlayerId[], scores, tieBreak) {
      const { error } = await games()
        .update({
          status: "ended",
          ended_at: new Date().toISOString(),
          tie_break: (tieBreak ?? null) as Json,
        })
        .eq("id", id);
      if (error) {
        throw new Error(`Fin de la partie: ${error.message}`);
      }

      // Persist each player's final score, plus the per-category breakdown for
      // category-scored games (scored games only).
      for (const { playerId, score, breakdown } of scores ?? []) {
        const { error: scoreError } = await supabase
          .from("game_players")
          .update({
            score: Math.round(score),
            score_breakdown: (breakdown ?? null) as Json,
          })
          .eq("game_id", id)
          .eq("player_id", playerId);
        /* c8 ignore next 3 -- defensive guard: update errors surface via e2e */
        if (scoreError) {
          throw new Error(`Enregistrement des scores: ${scoreError.message}`);
        }
      }

      // Several winners on a shared victory the tie-break rules couldn't split.
      const { error: winnerError } = await supabase
        .from("game_players")
        .update({ is_winner: true })
        .eq("game_id", id)
        .in("player_id", winnerIds);
      /* c8 ignore next 3 -- defensive guard: update errors surface via e2e */
      if (winnerError) {
        throw new Error(`Enregistrement du gagnant: ${winnerError.message}`);
      }
    },

    async setBreakdown(id: GameId, winnerIds: PlayerId[], scores, tieBreak) {
      for (const { playerId, score, breakdown } of scores) {
        const { error } = await supabase
          .from("game_players")
          .update({
            score: Math.round(score),
            score_breakdown: breakdown as Json,
          })
          .eq("game_id", id)
          .eq("player_id", playerId);
        /* c8 ignore next 3 -- defensive guard: update errors surface via e2e */
        if (error) {
          throw new Error(`Enregistrement du détail: ${error.message}`);
        }
      }

      // The re-derived totals may change who won → reset every flag, then set.
      const { error: resetError } = await supabase
        .from("game_players")
        .update({ is_winner: false })
        .eq("game_id", id);
      /* c8 ignore next 3 -- defensive guard: update errors surface via e2e */
      if (resetError) {
        throw new Error(`Réinitialisation du gagnant: ${resetError.message}`);
      }

      const { error: winnerError } = await supabase
        .from("game_players")
        .update({ is_winner: true })
        .eq("game_id", id)
        .in("player_id", winnerIds);
      /* c8 ignore next 3 -- defensive guard: update errors surface via e2e */
      if (winnerError) {
        throw new Error(`Enregistrement du gagnant: ${winnerError.message}`);
      }

      const { error: tieError } = await games()
        .update({ tie_break: (tieBreak ?? null) as Json })
        .eq("id", id);
      /* c8 ignore next 3 -- defensive guard: update errors surface via e2e */
      if (tieError) {
        throw new Error(`Enregistrement du départage: ${tieError.message}`);
      }
    },

    async endCoop(id: GameId, won: boolean) {
      const { error } = await games()
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", id);
      if (error) {
        throw new Error(`Fin de la partie: ${error.message}`);
      }

      // Shared outcome: everyone wins together, or no one does.
      const { error: coopError } = await supabase
        .from("game_players")
        .update({ is_winner: won })
        .eq("game_id", id);
      /* c8 ignore next 3 -- defensive guard: update errors surface via e2e */
      if (coopError) {
        throw new Error(`Enregistrement du résultat: ${coopError.message}`);
      }
    },

    /* c8 ignore start -- Realtime channel glue, exercised via e2e/manual */
    subscribe(onChange: () => void): Unsubscribe {
      const channel = supabase
        .channel("public:games")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "games" },
          () => onChange(),
        )
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    },
    /* c8 ignore stop */
  };
}
