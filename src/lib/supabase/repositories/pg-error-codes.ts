// Postgres error codes surfaced by PostgREST, shared by the adapters that map
// them to typed domain errors.

/** Unique constraint / index violation. */
export const UNIQUE_VIOLATION = "23505";

/** Foreign-key violation (e.g. on-delete-restrict). */
export const FK_VIOLATION = "23503";
