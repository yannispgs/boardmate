"use client";

import { useCallback, useEffect, useState } from "react";

import type { ScenarioSpec } from "@/lib/catan/scenario-spec";
import type {
  BoardgameId,
  Extension,
  ExtensionScenario,
  ExtensionScenarioId,
} from "@/lib/domain";
import { getExtensionRepository } from "@/lib/repositories";

/**
 * The active extensions available for a base game (empty when none / while
 * loading). Reloads when the base game changes.
 */
export function useExtensions(baseGameId: BoardgameId | null): Extension[] {
  const [extensions, setExtensions] = useState<Extension[]>([]);

  useEffect(() => {
    if (baseGameId === null) {
      setExtensions([]);

      return;
    }

    let active = true;

    getExtensionRepository()
      .listByBase(baseGameId)
      .then(list => {
        if (active) {
          setExtensions(list);
        }
      })
      .catch(() => {
        if (active) {
          setExtensions([]);
        }
      });

    return () => {
      active = false;
    };
  }, [baseGameId]);

  return extensions;
}

/** A scenario on its way to the database — no id yet if it's a new one. */
export interface ScenarioDraft {
  id: ExtensionScenarioId | null;
  name: string;
  targetScore: number | null;
  boardSpec: ScenarioSpec;
}

/** The scenarios of one extension, and the two ways of changing them. */
export interface ScenarioStore {
  scenarios: ExtensionScenario[];
  /** The game the extension belongs to — where its scenarios are managed. */
  baseGameId: BoardgameId | null;
  loading: boolean;
  save(draft: ScenarioDraft): Promise<void>;
  remove(id: ExtensionScenarioId): Promise<void>;
}

/**
 * The scenarios authored for one extension, found by its stable key — what the
 * Marins generator lists and its editor writes to. Every write reloads the list,
 * so the screen never has to guess what the database made of it.
 *
 * A screen that was served the extension already — the game's extensions page
 * renders it server-side — hands it over as `initial` and shows its scenarios
 * straight away, instead of blanking on a round-trip it has already paid for.
 */
export function useScenarios(
  key: string,
  initial: Extension | null = null,
): ScenarioStore {
  const [extension, setExtension] = useState<Extension | null>(initial);
  const [loading, setLoading] = useState(initial === null);

  const reload = useCallback(async () => {
    const found = await getExtensionRepository().getByKey(key);

    setExtension(found);
  }, [key]);

  useEffect(() => {
    let active = true;

    getExtensionRepository()
      .getByKey(key)
      .then(found => {
        if (active) {
          setExtension(found);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [key]);

  const save = useCallback(
    async (draft: ScenarioDraft) => {
      const repo = getExtensionRepository();

      if (draft.id !== null) {
        await repo.updateScenario(draft.id, {
          name: draft.name,
          targetScore: draft.targetScore,
          boardSpec: draft.boardSpec,
        });
      } else {
        if (extension === null) {
          throw new Error("Extension introuvable.");
        }

        await repo.createScenario({
          extensionId: extension.id,
          name: draft.name,
          targetScore: draft.targetScore,
          boardSpec: draft.boardSpec,
          sortOrder: extension.scenarios.length,
        });
      }

      await reload();
    },
    [extension, reload],
  );

  const remove = useCallback(
    async (id: ExtensionScenarioId) => {
      await getExtensionRepository().deleteScenario(id);
      await reload();
    },
    [reload],
  );

  return {
    scenarios: extension?.scenarios ?? [],
    baseGameId: extension?.baseGameId ?? null,
    loading,
    save,
    remove,
  };
}
