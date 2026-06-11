import type { SupabaseClient } from "@supabase/supabase-js";

import type { NewPlayer, Player, PlayerId, PlayerUpdate } from "@/lib/domain";
import type { PlayerRepository, Unsubscribe } from "@/lib/repositories/types";
import type { Database } from "@/lib/supabase/database.types";

type PlayerRow = Database["public"]["Tables"]["players"]["Row"];

/** Maps a raw DB row to the domain `Player` (snake_case -> camelCase). */
function toPlayer(row: PlayerRow): Player {
  return {
    id: row.id as PlayerId,
    name: row.name,
    isActive: row.is_active,
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
      if (error) throw new Error(`Lecture des joueurs: ${error.message}`);
      return data.map(toPlayer);
    },

    async get(id: PlayerId) {
      const { data, error } = await players()
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(`Lecture du joueur: ${error.message}`);
      return data ? toPlayer(data) : null;
    },

    async create(input: NewPlayer) {
      const { data, error } = await players()
        .insert({ name: input.name })
        .select("*")
        .single();
      if (error) throw new Error(`Création du joueur: ${error.message}`);
      return toPlayer(data);
    },

    async update(id: PlayerId, patch: PlayerUpdate) {
      const { data, error } = await players()
        .update({ name: patch.name })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new Error(`Mise à jour du joueur: ${error.message}`);
      return toPlayer(data);
    },

    async setActive(id: PlayerId, isActive: boolean) {
      const { data, error } = await players()
        .update({ is_active: isActive })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new Error(`Activation du joueur: ${error.message}`);
      return toPlayer(data);
    },

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
  };
}
