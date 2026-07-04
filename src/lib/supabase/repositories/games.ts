import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  BoardgameId,
  ConfigId,
  FieldSpec,
  Game,
  GameId,
  GameListItem,
  GamePlayer,
  GameStatus,
  GameTurn,
  GameTurnId,
  NewGame,
  Player,
  PlayerId,
  PopulatedGame,
} from "@/lib/domain";
import { winThresholdFrom } from "@/lib/game/scoring";
import { advanceTurn as nextTurnState } from "@/lib/game/turn";
import type { GameRepository, Unsubscribe } from "@/lib/repositories/types";
import type { Database } from "@/lib/supabase/database.types";
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
    playerId: row.player_id as PlayerId,
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
    player: PlayerRow;
  }>;
  game_turns: GameTurnRow[];
};

const POPULATED_SELECT =
  "*, boardgame:boardgames(*, config_templates(fields)), config:configs(*), " +
  "game_players(*, player:players(*)), game_turns(*)";

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
          player: toPlayer(gp.player),
        })) satisfies Array<GamePlayer & { player: Player }>;

      const boardgame = toBoardgame(row.boardgame);
      const config = row.config ? toConfig(row.config) : null;
      const templateFields = (row.boardgame.config_templates?.fields ??
        []) as unknown as FieldSpec[];
      const winThreshold = boardgame.scoring
        ? winThresholdFrom(
            boardgame.scoring.winCondition,
            config?.values ?? null,
            templateFields,
          )
        : null;

      const populated: PopulatedGame = {
        ...toGame(row),
        boardgame,
        config,
        winThreshold,
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
      }));
      const { error: gpError } = await supabase
        .from("game_players")
        .insert(rows);
      if (gpError) {
        throw new Error(`Ajout des joueurs: ${gpError.message}`);
      }
      return toGame(game);
    },

    async advanceTurn(
      id: GameId,
      elapsedSeconds: number,
      pauseCount: number,
      pauseDurationSeconds: number,
      overtimeSeconds: number,
    ) {
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

      // Record the completed turn's active time for the player who just played.
      /* c8 ignore next -- a live game always has a current player to record */
      if (game.current_player_id) {
        const { error: turnError } = await supabase.from("game_turns").insert({
          game_id: id,
          player_id: game.current_player_id,
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

      const next = nextTurnState(game.turn, seats.length);
      const { error: updateError } = await games()
        .update({
          turn: next.turn,
          round: next.round,
          /* c8 ignore next -- defensive `?.`/`?? null`; seat index is in range */
          current_player_id: seats[next.seatIndex]?.player_id ?? null,
        })
        .eq("id", id);
      /* c8 ignore next 3 -- defensive guard: update errors surface via e2e */
      if (updateError) {
        throw new Error(`Mise à jour du tour: ${updateError.message}`);
      }
    },

    async setScore(id: GameId, playerId: PlayerId, score: number) {
      const { error } = await supabase
        .from("game_players")
        .update({ score: Math.round(score) })
        .eq("game_id", id)
        .eq("player_id", playerId);
      /* c8 ignore next 3 -- defensive guard: update errors surface via e2e */
      if (error) {
        throw new Error(`Enregistrement du score: ${error.message}`);
      }
    },

    async end(id: GameId, winnerId: PlayerId, scores) {
      const { error } = await games()
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", id);
      if (error) {
        throw new Error(`Fin de la partie: ${error.message}`);
      }

      // Persist each player's final score (scored games only).
      for (const { playerId, score } of scores ?? []) {
        const { error: scoreError } = await supabase
          .from("game_players")
          .update({ score: Math.round(score) })
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
        void supabase.removeChannel(channel);
      };
    },
    /* c8 ignore stop */
  };
}
