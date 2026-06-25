import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  BoardgameId,
  ConfigId,
  Game,
  GameId,
  GamePlayer,
  GameStatus,
  GameTurn,
  GameTurnId,
  NewGame,
  Player,
  PlayerId,
  PopulatedGame,
} from "@/lib/domain";
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
    currentPlayerId: (row.current_player_id as PlayerId | null) ?? null,
    startedAt: row.started_at,
    endedAt: row.ended_at,
  };
}

function toGameTurn(row: GameTurnRow): GameTurn {
  return {
    id: row.id as GameTurnId,
    gameId: row.game_id as GameId,
    playerId: row.player_id as PlayerId,
    round: row.round,
    turnNo: row.turn_no,
    durationS: row.duration_s,
  };
}

// Shape returned by the nested `getPopulated` select.
type PopulatedRow = GameRow & {
  boardgame: BoardgameRow;
  config: ConfigRow | null;
  game_players: Array<{
    game_id: string;
    player_id: string;
    seat_order: number;
    is_winner: boolean;
    player: PlayerRow;
  }>;
  game_turns: GameTurnRow[];
};

const POPULATED_SELECT =
  "*, boardgame:boardgames(*), config:configs(*), " +
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
        .select("*")
        .eq("status", status)
        .order("started_at", { ascending: false });
      if (error) {
        throw new Error(`Lecture des parties: ${error.message}`);
      }
      return data.map(toGame);
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
          player: toPlayer(gp.player),
        })) satisfies Array<GamePlayer & { player: Player }>;

      const populated: PopulatedGame = {
        ...toGame(row),
        boardgame: toBoardgame(row.boardgame),
        config: row.config ? toConfig(row.config) : null,
        players,
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

    async advanceTurn(id: GameId, elapsedSeconds: number) {
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
      if (seatsError) {
        throw new Error(`Lecture des joueurs: ${seatsError.message}`);
      }

      // Record the completed turn's active time for the player who just played.
      if (game.current_player_id) {
        const { error: turnError } = await supabase.from("game_turns").insert({
          game_id: id,
          player_id: game.current_player_id,
          round: game.round,
          turn_no: game.turn,
          duration_s: Math.max(0, Math.round(elapsedSeconds)),
        });
        if (turnError) {
          throw new Error(`Enregistrement du tour: ${turnError.message}`);
        }
      }

      const next = nextTurnState(game.turn, seats.length);
      const { error: updateError } = await games()
        .update({
          turn: next.turn,
          round: next.round,
          current_player_id: seats[next.seatIndex]?.player_id ?? null,
        })
        .eq("id", id);
      if (updateError) {
        throw new Error(`Mise à jour du tour: ${updateError.message}`);
      }
    },

    async end(id: GameId, winnerId: PlayerId) {
      const { error } = await games()
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", id);
      if (error) {
        throw new Error(`Fin de la partie: ${error.message}`);
      }

      const { error: winnerError } = await supabase
        .from("game_players")
        .update({ is_winner: true })
        .eq("game_id", id)
        .eq("player_id", winnerId);
      if (winnerError) {
        throw new Error(`Enregistrement du gagnant: ${winnerError.message}`);
      }
    },

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
  };
}
