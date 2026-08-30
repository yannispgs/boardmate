import type { SupabaseClient } from "@supabase/supabase-js";

import { parseScenarioSpec } from "@/lib/catan/scenario-schema";
import type {
  BoardgameId,
  Extension,
  ExtensionId,
  ExtensionScenario,
  ExtensionScenarioId,
  ExtensionScenarioUpdate,
  FieldSpec,
  NewExtensionScenario,
  RoundGoal,
  ScoringDelta,
} from "@/lib/domain";
import { ScenarioInUseError } from "@/lib/repositories/errors";
import type { ExtensionRepository } from "@/lib/repositories/types";
import type { Database, Json } from "@/lib/supabase/database.types";
import { FK_VIOLATION } from "@/lib/supabase/repositories/pg-error-codes";

type ExtensionRow = Database["public"]["Tables"]["extensions"]["Row"];
type ScenarioRow = Database["public"]["Tables"]["extension_scenarios"]["Row"];

export function toScenario(row: ScenarioRow): ExtensionScenario {
  return {
    id: row.id as ExtensionScenarioId,
    extensionId: row.extension_id as ExtensionId,
    name: row.name,
    targetScore: row.target_score,
    isOfficial: row.is_official,
    // Authored in the app, so written by the client: never trusted on the way
    // back in. A blob that no longer fits the format reads as no board at all.
    boardSpec: parseScenarioSpec(row.board_spec),
    sortOrder: row.sort_order,
  };
}

export function toExtension(
  row: ExtensionRow & { extension_scenarios: ScenarioRow[] },
): Extension {
  return {
    id: row.id as ExtensionId,
    baseGameId: row.base_game_id as BoardgameId,
    key: row.key,
    name: row.name,
    configFields: row.config_fields as unknown as FieldSpec[],
    scoringDelta: row.scoring_delta as unknown as ScoringDelta | null,
    roundGoals: row.round_goals as unknown as RoundGoal[],
    targetModifier: row.target_modifier,
    hasScenarios: row.has_scenarios,
    changesBoard: row.changes_board,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    scenarios: [...row.extension_scenarios]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(toScenario),
  };
}

/**
 * Supabase-backed `ExtensionRepository`. The extensions themselves are seeded
 * reference data, read-only here; their scenarios can also be authored in the
 * app, so those are written back.
 */
export function createExtensionRepository(
  supabase: SupabaseClient<Database>,
): ExtensionRepository {
  const scenarios = () => supabase.from("extension_scenarios");

  return {
    async listByBase(baseGameId: BoardgameId) {
      const { data, error } = await supabase
        .from("extensions")
        .select("*, extension_scenarios(*)")
        .eq("base_game_id", baseGameId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      /* c8 ignore next 3 -- defensive guard: a healthy select doesn't error */
      if (error) {
        throw new Error(`Lecture des extensions: ${error.message}`);
      }

      return (
        data as unknown as Array<
          ExtensionRow & { extension_scenarios: ScenarioRow[] }
        >
      ).map(toExtension);
    },

    async listAll() {
      const { data, error } = await supabase
        .from("extensions")
        .select("*, extension_scenarios(*)")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      /* c8 ignore next 3 -- defensive guard: a healthy select doesn't error */
      if (error) {
        throw new Error(`Lecture des extensions: ${error.message}`);
      }

      return (
        data as unknown as Array<
          ExtensionRow & { extension_scenarios: ScenarioRow[] }
        >
      ).map(toExtension);
    },

    async getByKey(key: string) {
      const { data, error } = await supabase
        .from("extensions")
        .select("*, extension_scenarios(*)")
        .eq("key", key)
        .maybeSingle();
      /* c8 ignore next 3 -- defensive guard: a healthy select doesn't error */
      if (error) {
        throw new Error(`Lecture de l'extension: ${error.message}`);
      }

      return data
        ? toExtension(
            data as unknown as ExtensionRow & {
              extension_scenarios: ScenarioRow[];
            },
          )
        : null;
    },

    async createScenario(input: NewExtensionScenario) {
      const { data, error } = await scenarios()
        .insert({
          extension_id: input.extensionId,
          name: input.name,
          target_score: input.targetScore,
          board_spec: input.boardSpec as unknown as Json,
          sort_order: input.sortOrder,
        })
        .select("*")
        .single();

      if (error) {
        throw new Error(`Création du scénario: ${error.message}`);
      }

      return toScenario(data);
    },

    async updateScenario(
      id: ExtensionScenarioId,
      patch: ExtensionScenarioUpdate,
    ) {
      const { data, error } = await scenarios()
        .update({
          name: patch.name,
          target_score: patch.targetScore,
          board_spec: patch.boardSpec as unknown as Json,
        })
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        throw new Error(`Mise à jour du scénario: ${error.message}`);
      }

      return toScenario(data);
    },

    async deleteScenario(id: ExtensionScenarioId) {
      // The on-delete-restrict FK from game_extensions makes Postgres reject
      // the delete (23503) once a game has been played with the scenario, so
      // history is never rewritten. No prior count needed; the check is atomic.
      const { error } = await scenarios().delete().eq("id", id);

      if (error) {
        if (error.code === FK_VIOLATION) {
          throw new ScenarioInUseError();
        }

        throw new Error(`Suppression du scénario: ${error.message}`);
      }
    },
  };
}
