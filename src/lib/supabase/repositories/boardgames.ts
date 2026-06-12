import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Boardgame,
  BoardgameId,
  BoardgameKind,
  BoardgameUpdate,
  NewBoardgame,
} from "@/lib/domain";
import type {
  BoardgameRepository,
  Unsubscribe,
} from "@/lib/repositories/types";
import type { Database } from "@/lib/supabase/database.types";

type BoardgameRow = Database["public"]["Tables"]["boardgames"]["Row"];
type BoardgameWrite = Database["public"]["Tables"]["boardgames"]["Update"];

const LOGO_BUCKET = "logos";

/** Maps a raw DB row to the domain `Boardgame` (snake_case -> camelCase). */
function toBoardgame(row: BoardgameRow): Boardgame {
  return {
    id: row.id as BoardgameId,
    name: row.name,
    logoUrl: row.logo_url,
    minPlayers: row.min_players,
    maxPlayers: row.max_players,
    recMinPlayers: row.rec_min_players,
    recMaxPlayers: row.rec_max_players,
    kind: row.kind as BoardgameKind,
    avgDurationMin: row.avg_duration_min,
    tags: row.tags,
    createdAt: row.created_at,
  };
}

/**
 * Maps a domain input to a partial DB write payload (camelCase -> snake_case).
 * Only keys actually present are emitted, so an update never overwrites a
 * column that wasn't in the patch.
 */
function toRow(input: NewBoardgame | BoardgameUpdate): BoardgameWrite {
  const row: BoardgameWrite = {};
  if (input.name !== undefined) row.name = input.name;
  if (input.logoUrl !== undefined) row.logo_url = input.logoUrl;
  if (input.minPlayers !== undefined) row.min_players = input.minPlayers;
  if (input.maxPlayers !== undefined) row.max_players = input.maxPlayers;
  if (input.recMinPlayers !== undefined)
    row.rec_min_players = input.recMinPlayers;
  if (input.recMaxPlayers !== undefined)
    row.rec_max_players = input.recMaxPlayers;
  if (input.kind !== undefined) row.kind = input.kind;
  if (input.avgDurationMin !== undefined)
    row.avg_duration_min = input.avgDurationMin;
  if (input.tags !== undefined) row.tags = input.tags;
  return row;
}

/**
 * Supabase-backed `BoardgameRepository`. The only place the Supabase SDK touches
 * boardgames — swapping the backend means rewriting just this file.
 */
export function createBoardgameRepository(
  supabase: SupabaseClient<Database>,
): BoardgameRepository {
  const boardgames = () => supabase.from("boardgames");

  return {
    async list() {
      const { data, error } = await boardgames()
        .select("*")
        .order("name", { ascending: true });
      if (error) throw new Error(`Lecture des jeux: ${error.message}`);
      return data.map(toBoardgame);
    },

    async get(id: BoardgameId) {
      const { data, error } = await boardgames()
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(`Lecture du jeu: ${error.message}`);
      return data ? toBoardgame(data) : null;
    },

    async create(input: NewBoardgame) {
      // name is required on NewBoardgame; spread the rest of the mapped fields.
      const { data, error } = await boardgames()
        .insert({ ...toRow(input), name: input.name })
        .select("*")
        .single();
      if (error) throw new Error(`Création du jeu: ${error.message}`);
      return toBoardgame(data);
    },

    async update(id: BoardgameId, patch: BoardgameUpdate) {
      const { data, error } = await boardgames()
        .update(toRow(patch))
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new Error(`Mise à jour du jeu: ${error.message}`);
      return toBoardgame(data);
    },

    async remove(id: BoardgameId) {
      // The DB restricts deletion of a boardgame that already has games
      // (on delete restrict), preserving history; surfaced as an error here.
      const { error } = await boardgames().delete().eq("id", id);
      if (error) throw new Error(`Suppression du jeu: ${error.message}`);
    },

    async uploadLogo(file: File) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${crypto.randomUUID()}.${ext}`;
      const bucket = supabase.storage.from(LOGO_BUCKET);
      const { error } = await bucket.upload(path, file, {
        contentType: file.type || undefined,
        upsert: false,
      });
      if (error) throw new Error(`Envoi du logo: ${error.message}`);
      return bucket.getPublicUrl(path).data.publicUrl;
    },

    subscribe(onChange: () => void): Unsubscribe {
      const channel = supabase
        .channel("public:boardgames")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "boardgames" },
          () => onChange(),
        )
        .subscribe();
      return () => {
        void supabase.removeChannel(channel);
      };
    },
  };
}
