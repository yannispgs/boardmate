import type { SupabaseClient } from "@supabase/supabase-js";

import type { NewPlayer, Player, PlayerId, PlayerUpdate } from "@/lib/domain";
import {
  DuplicateNameError,
  PlayerInUseError,
} from "@/lib/repositories/errors";
import type { PlayerRepository, Unsubscribe } from "@/lib/repositories/types";
import type { Database } from "@/lib/supabase/database.types";
import {
  FK_VIOLATION,
  UNIQUE_VIOLATION,
} from "@/lib/supabase/repositories/pg-error-codes";

type PlayerRow = Database["public"]["Tables"]["players"]["Row"];

/** Maps a raw DB row to the domain `Player` (snake_case -> camelCase). */
export function toPlayer(row: PlayerRow): Player {
  return {
    id: row.id as PlayerId,
    name: row.name,
    isActive: row.is_active,
    // Denormalized column kept up to date by a DB trigger on game_players.
    hasPlayed: row.has_played,
    createdAt: row.created_at,
  };
}

/**
 * Supabase-backed `PlayerRepository`. The only place the Supabase SDK touches
 * players — swapping the backend means rewriting just this file.
 */
export function createPlayerRepository(
  supabase: SupabaseClient<Database>,
): PlayerRepository {
  const players = () => supabase.from("players");

  return {
    async list() {
      const { data, error } = await players()
        .select("*")
        .order("name", { ascending: true });
      /* c8 ignore next 3 -- defensive guard: a healthy select doesn't error */
      if (error) {
        throw new Error(`Lecture des joueurs: ${error.message}`);
      }
      return data.map(toPlayer);
    },

    async get(id: PlayerId) {
      const { data, error } = await players()
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) {
        throw new Error(`Lecture du joueur: ${error.message}`);
      }
      return data ? toPlayer(data) : null;
    },

    async create(input: NewPlayer) {
      const { data, error } = await players()
        .insert({ name: input.name })
        .select("*")
        .single();
      if (error) {
        if (error.code === UNIQUE_VIOLATION) {
          throw new DuplicateNameError();
        }
        throw new Error(`Création du joueur: ${error.message}`);
      }
      return toPlayer(data);
    },

    async update(id: PlayerId, patch: PlayerUpdate) {
      const { data, error } = await players()
        .update({ name: patch.name })
        .eq("id", id)
        .select("*")
        .single();
      if (error) {
        if (error.code === UNIQUE_VIOLATION) {
          throw new DuplicateNameError();
        }
        throw new Error(`Mise à jour du joueur: ${error.message}`);
      }
      return toPlayer(data);
    },

    async setActive(id: PlayerId, isActive: boolean) {
      const { data, error } = await players()
        .update({ is_active: isActive })
        .eq("id", id)
        .select("*")
        .single();
      if (error) {
        throw new Error(`Activation du joueur: ${error.message}`);
      }
      return toPlayer(data);
    },

    async remove(id: PlayerId) {
      // The on-delete-restrict FKs from game_players/game_turns make Postgres
      // reject the delete (23503) if the player has played — surfaced as a
      // typed PlayerInUseError. No prior count needed; the check is atomic.
      const { error } = await players().delete().eq("id", id);
      if (error) {
        if (error.code === FK_VIOLATION) {
          throw new PlayerInUseError();
        }
        throw new Error(`Suppression du joueur: ${error.message}`);
      }
    },

    /* c8 ignore start -- Realtime channel glue, exercised via e2e/manual */
    subscribe(onChange: () => void): Unsubscribe {
      const channel = supabase
        .channel("public:players")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "players" },
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
