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
