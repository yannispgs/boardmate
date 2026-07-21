import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  BoardgameId,
  ConfigId,
  ConfigValues,
  FieldSpec,
  Game,
  GameId,
  GameListItem,
  GamePlayer,
  GameStatsRecord,
  GameStatus,
  GameTurn,
  GameTurnId,
  NewGame,
  Player,
  PlayerId,
  PopulatedGame,
  TurnMode,
} from "@/lib/domain";
import { winThresholdFrom } from "@/lib/game/scoring";
import { advanceTurn as nextTurnState } from "@/lib/game/turn";
import { turnScheduleFrom } from "@/lib/game/turn-schedule";
import type { GameRepository, Unsubscribe } from "@/lib/repositories/types";
import type { Database, Json } from "@/lib/supabase/database.types";
import { toBoardgame } from "@/lib/supabase/repositories/boardgames";
import { toConfig } from "@/lib/supabase/repositories/configs";
import { toPlayer } from "@/lib/supabase/repositories/players";

type GameRow = Database["public"]["Tables"]["games"]["Row"];
type BoardgameRow = Database["public"]["Tables"]["boardgames"]["Row"];
type ConfigRow = Database["public"]["Tables"]["configs"]["Row"];
type PlayerRow = Database["public"]["Tables"]["players"]["Row"];
type GameTurnRow = Database["public"]["Tables"]["game_turns"]["Row"];

function toGame(row: GameRow): Game {
  return {
    id: row.id as GameId,
    boardgameId: row.boardgame_id as BoardgameId,
    configId: (row.config_id as ConfigId | null) ?? null,
    configValues: (row.config_values as ConfigValues | null) ?? null,
    status: row.status as GameStatus,
    round: row.round,
    turn: row.turn,
    /* c8 ignore next -- defensive `?? null`; the cast value is already nullable */
    currentPlayerId: (row.current_player_id as PlayerId | null) ?? null,
    startedAt: row.started_at,
    endedAt: row.ended_at,
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

  return { ...toGame(row), players };
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
  score_events: Array<{
    player_id: string;
    score: number;
    round: number;
    created_at: string;
  }>;
  dice_rolls: Array<{ value: number; created_at: string }>;
};

const POPULATED_SELECT =
  "*, boardgame:boardgames(*, config_templates(fields)), config:configs(*), " +
  "game_players(*, player:players(*)), game_turns(*), " +
  "score_events(player_id, score, round, created_at), " +
  "dice_rolls(value, created_at)";

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
          "*, game_players(seat_order, is_winner, score, player:players(id, name))",
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
      // The game's own snapshot (tweaked at the recap) wins over the source
      // config's values, which win over the template default.
      const effectiveValues =
        (row.config_values as ConfigValues | null) ?? config?.values ?? null;
      const winThreshold = boardgame.scoring
        ? winThresholdFrom(
            boardgame.scoring.winCondition,
            effectiveValues,
            templateFields,
          )
        : null;
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

      const populated: PopulatedGame = {
        ...toGame(row),
        boardgame,
        config,
        winThreshold,
        turnSchedule,
        scoreEvents,
        diceRolls,
        players,
        /* c8 ignore next 2 -- `?? null` fallback for a current player not found */
        currentPlayer:
          players.find(p => p.playerId === row.current_player_id)?.player ??
          null,
        turns: row.game_turns.map(toGameTurn),
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
      },
    ) {
      const simultaneous = opts?.turnMode === "simultaneous";
      const blockedById = opts?.blockedById ?? null;
      const waitedS =
        simultaneous && blockedById !== null
          ? Math.max(0, Math.round(opts?.waitedSeconds ?? 0))
          : null;

      const { data: game, error } = await games()
        .select("round, turn, current_player_id")
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

      // Record the completed turn: the round's active time, attributed to the
      // player who just played (sequential) or to nobody (simultaneous).
      /* c8 ignore next -- a live sequential game always has a current player */
      if (simultaneous || game.current_player_id) {
        const { error: turnError } = await supabase.from("game_turns").insert({
          game_id: id,
          player_id: simultaneous ? null : game.current_player_id,
          blocked_by_player_id: simultaneous ? blockedById : null,
          waited_s: waitedS,
          round: game.round,
          turn_no: game.turn,
          duration_s: Math.max(0, Math.round(elapsedSeconds)),
          pause_count: Math.max(0, Math.round(pauseCount)),
          pause_duration_s: Math.max(0, Math.round(pauseDurationSeconds)),
          overtime_s: Math.max(0, Math.round(overtimeSeconds)),
        });
        /* c8 ignore next 3 -- defensive guard: insert errors surface via e2e */
        if (turnError) {
          throw new Error(`Enregistrement du tour: ${turnError.message}`);
        }
      }

      const next = nextTurnState(game.turn, perRound);
      const { error: updateError } = await games()
        .update({
          turn: next.turn,
          round: next.round,
          // Simultaneous games have no current player.
          /* c8 ignore next -- defensive `?.`/`?? null`; seat index is in range */
          current_player_id: simultaneous
            ? null
            : (seats[next.seatIndex]?.player_id ?? null),
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

    async end(id: GameId, winnerId: PlayerId, scores) {
      const { error } = await games()
        .update({ status: "ended", ended_at: new Date().toISOString() })
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

      const { error: winnerError } = await supabase
        .from("game_players")
        .update({ is_winner: true })
        .eq("game_id", id)
        .eq("player_id", winnerId);
      /* c8 ignore next 3 -- defensive guard: update errors surface via e2e */
      if (winnerError) {
        throw new Error(`Enregistrement du gagnant: ${winnerError.message}`);
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
