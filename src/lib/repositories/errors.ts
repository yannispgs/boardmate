/**
 * Domain-level repository errors. Adapters translate vendor-specific failures
 * (e.g. Postgres error codes) into these so the UI can react without knowing
 * anything about the backend.
 */

/** A name collides with an existing one (case-insensitive, trimmed). */
export class DuplicateNameError extends Error {
  constructor(message = "Ce nom est déjà pris.") {
    super(message);
    this.name = "DuplicateNameError";
  }
}

/** A player can't be deleted because they've already taken part in a game. */
export class PlayerInUseError extends Error {
  constructor(message = "Ce joueur a déjà participé à une partie.") {
    super(message);
    this.name = "PlayerInUseError";
  }
}

/** A scenario can't be deleted because a played game still refers to it. */
export class ScenarioInUseError extends Error {
  constructor(message = "Ce scénario a déjà été joué.") {
    super(message);
    this.name = "ScenarioInUseError";
  }
}

/** A milestone was claimed by somebody else first — claims are exclusive. */
export class AlreadyClaimedError extends Error {
  constructor(message = "Ce jalon vient d'être pris.") {
    super(message);
    this.name = "AlreadyClaimedError";
  }
}

/**
 * The game was recorded as finished while this screen was still counting —
 * a party ends once, and the first count is the one that stands.
 */
export class AlreadyEndedError extends Error {
  constructor(message = "Cette partie vient d'être terminée.") {
    super(message);
    this.name = "AlreadyEndedError";
  }
}

/** A boardgame can't be deleted because it already has games. */
export class BoardgameInUseError extends Error {
  constructor(message = "Ce jeu a déjà des parties enregistrées.") {
    super(message);
    this.name = "BoardgameInUseError";
  }
}
