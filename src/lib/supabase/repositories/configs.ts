import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BoardgameId,
  Config,
  ConfigId,
  ConfigTemplate,
  ConfigValues,
  FieldSpec,
  NewConfig,
} from "@/lib/domain";
import type { ConfigRepository, Unsubscribe } from "@/lib/repositories/types";
import type { Database, Json } from "@/lib/supabase/database.types";

type ConfigRow = Database["public"]["Tables"]["configs"]["Row"];
type TemplateRow = Database["public"]["Tables"]["config_templates"]["Row"];

/** Maps a config_templates row to the domain `ConfigTemplate`. */
function toTemplate(row: TemplateRow): ConfigTemplate {
  return {
    boardgameId: row.boardgame_id as BoardgameId,
    // `fields` is authored by us as data, so the shape is trusted here.
    /* c8 ignore next -- `?? []` is a defensive fallback; the column is NOT NULL */
    fields: (row.fields ?? []) as unknown as FieldSpec[],
  };
}

/** Maps a configs row to the domain `Config` (snake_case -> camelCase). */
export function toConfig(row: ConfigRow): Config {
  return {
    id: row.id as ConfigId,
    boardgameId: row.boardgame_id as BoardgameId,
    name: row.name,
    /* c8 ignore next -- `?? {}` is a defensive fallback; the column is NOT NULL */
    values: (row.values ?? {}) as ConfigValues,
    createdAt: row.created_at,
  };
}

/**
 * Supabase-backed `ConfigRepository`. The only place the Supabase SDK touches
 * config templates and instances — swapping the backend means rewriting just
 * this file. Value validation against the template lives in the domain layer
 * (`@/lib/config/validation`), not here.
 */
export function createConfigRepository(
  supabase: SupabaseClient<Database>,
): ConfigRepository {
  const templates = () => supabase.from("config_templates");
  const configs = () => supabase.from("configs");

  return {
    async getTemplate(boardgameId: BoardgameId) {
      const { data, error } = await templates()
        .select("*")
        .eq("boardgame_id", boardgameId)
        .maybeSingle();
      if (error) {
        throw new Error(`Lecture du modèle: ${error.message}`);
      }
      return data ? toTemplate(data) : null;
    },

    async listTemplates() {
      const { data, error } = await templates().select("*");
      /* c8 ignore next 3 -- defensive guard: a healthy select doesn't error */
      if (error) {
        throw new Error(`Lecture des modèles: ${error.message}`);
      }
      return data.map(toTemplate);
    },

    async list(boardgameId?: BoardgameId) {
      let query = configs().select("*").order("name", { ascending: true });
      if (boardgameId) {
        query = query.eq("boardgame_id", boardgameId);
      }
      const { data, error } = await query;
      if (error) {
        throw new Error(`Lecture des configurations: ${error.message}`);
      }
      return data.map(toConfig);
    },

    async get(id: ConfigId) {
      const { data, error } = await configs()
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) {
        throw new Error(`Lecture de la configuration: ${error.message}`);
      }
      return data ? toConfig(data) : null;
    },

    async create(input: NewConfig) {
      const { data, error } = await configs()
        .insert({
          boardgame_id: input.boardgameId,
          name: input.name,
          values: input.values as Json,
        })
        .select("*")
        .single();
      if (error) {
        throw new Error(`Création de la configuration: ${error.message}`);
      }
      return toConfig(data);
    },

    async update(
      id: ConfigId,
      patch: { name?: string; values?: ConfigValues },
    ) {
      const row: Database["public"]["Tables"]["configs"]["Update"] = {};
      if (patch.name !== undefined) {
        row.name = patch.name;
      }
      if (patch.values !== undefined) {
        row.values = patch.values as Json;
      }
      const { data, error } = await configs()
        .update(row)
        .eq("id", id)
        .select("*")
        .single();
      if (error) {
        throw new Error(`Mise à jour de la configuration: ${error.message}`);
      }
      return toConfig(data);
    },

    async remove(id: ConfigId) {
      const { error } = await configs().delete().eq("id", id);
      if (error) {
        throw new Error(`Suppression de la configuration: ${error.message}`);
      }
    },

    /* c8 ignore start -- Realtime channel glue, exercised via e2e/manual */
    subscribe(onChange: () => void): Unsubscribe {
      const channel = supabase
        .channel("public:configs")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "configs" },
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
