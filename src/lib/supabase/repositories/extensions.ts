import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  BoardgameId,
  Extension,
  ExtensionId,
  ExtensionScenario,
  ExtensionScenarioId,
  FieldSpec,
  ScoringDelta,
} from "@/lib/domain";
import type { ExtensionRepository } from "@/lib/repositories/types";
import type { Database } from "@/lib/supabase/database.types";

type ExtensionRow = Database["public"]["Tables"]["extensions"]["Row"];
type ScenarioRow = Database["public"]["Tables"]["extension_scenarios"]["Row"];

export function toScenario(row: ScenarioRow): ExtensionScenario {
  return {
    id: row.id as ExtensionScenarioId,
    extensionId: row.extension_id as ExtensionId,
    name: row.name,
    targetScore: row.target_score,
    boardKey: row.board_key,
    sortOrder: row.sort_order,
  };
}

export function toExtension(
  row: ExtensionRow & { extension_scenarios: ScenarioRow[] },
): Extension {
  return {
    id: row.id as ExtensionId,
    baseGameId: row.base_game_id as BoardgameId,
    name: row.name,
    configFields: row.config_fields as unknown as FieldSpec[],
    scoringDelta: row.scoring_delta as unknown as ScoringDelta | null,
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
 * Supabase-backed `ExtensionRepository`. Extensions and their scenarios are
 * reference data (seeded); this only reads them.
 */
export function createExtensionRepository(
  supabase: SupabaseClient<Database>,
): ExtensionRepository {
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
  };
}
