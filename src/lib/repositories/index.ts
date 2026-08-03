export * from "./types";

import { createClient } from "@/lib/supabase/client";
import { createBoardgameRepository } from "@/lib/supabase/repositories/boardgames";
import { createConfigRepository } from "@/lib/supabase/repositories/configs";
import { createExtensionRepository } from "@/lib/supabase/repositories/extensions";
import { createFaqRepository } from "@/lib/supabase/repositories/faq";
import { createFeedbackRepository } from "@/lib/supabase/repositories/feedback";
import { createGameRepository } from "@/lib/supabase/repositories/games";
import { createPlayerRepository } from "@/lib/supabase/repositories/players";
import type {
  BoardgameRepository,
  ConfigRepository,
  ExtensionRepository,
  FaqRepository,
  FeedbackRepository,
  GameRepository,
  PlayerRepository,
} from "./types";

/**
 * Composition root: wires repository interfaces to the active vendor adapter.
 * The browser-backed singletons live here so the rest of the app depends only
 * on the interfaces, never on Supabase. Client-side only (uses the browser
 * client). More repositories will be added as their adapters land.
 */
let playerRepository: PlayerRepository | null = null;

export function getPlayerRepository(): PlayerRepository {
  if (!playerRepository) {
    playerRepository = createPlayerRepository(createClient());
  }
  return playerRepository;
}

let boardgameRepository: BoardgameRepository | null = null;

export function getBoardgameRepository(): BoardgameRepository {
  if (!boardgameRepository) {
    boardgameRepository = createBoardgameRepository(createClient());
  }
  return boardgameRepository;
}

let configRepository: ConfigRepository | null = null;

export function getConfigRepository(): ConfigRepository {
  if (!configRepository) {
    configRepository = createConfigRepository(createClient());
  }
  return configRepository;
}

let gameRepository: GameRepository | null = null;

export function getGameRepository(): GameRepository {
  if (!gameRepository) {
    gameRepository = createGameRepository(createClient());
  }
  return gameRepository;
}

let feedbackRepository: FeedbackRepository | null = null;

export function getFeedbackRepository(): FeedbackRepository {
  if (!feedbackRepository) {
    feedbackRepository = createFeedbackRepository(createClient());
  }
  return feedbackRepository;
}

let faqRepository: FaqRepository | null = null;

export function getFaqRepository(): FaqRepository {
  if (!faqRepository) {
    faqRepository = createFaqRepository(createClient());
  }
  return faqRepository;
}

let extensionRepository: ExtensionRepository | null = null;

export function getExtensionRepository(): ExtensionRepository {
  if (!extensionRepository) {
    extensionRepository = createExtensionRepository(createClient());
  }
  return extensionRepository;
}
