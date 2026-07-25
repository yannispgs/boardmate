/**
 * The runtime guard around an authored scenario.
 *
 * A scenario's board is written by the editor and stored as a jsonb blob, which
 * means it comes back from the database in whatever shape the client sent — the
 * column is storage, never a trust boundary. Everything read from it is parsed
 * here before the generator, or a view, is allowed to touch it.
 *
 * This checks the **shape and the size**, not the game rules: a spec can parse
 * cleanly and still not add up, which is what {@link validateScenarioSpec} is
 * for. The caps below exist so a hand-crafted blob can't make the generator chew
 * through a million spaces; they sit far above anything an author would paint.
 */

import { z } from "zod";

import { MAX_WIDTH, MIN_WIDTH, type ScenarioSpec } from "./scenario-spec";

/** Ceilings on a stored spec — a guard against absurd input, not a game rule. */
const MAX_NAME = 80;
const MAX_BOARDS = 8;
const MAX_ZONES = 64;
const MAX_CELLS = 512;
const MAX_TILES = 512;

const terrainSchema = z.enum([
  "forest",
  "pasture",
  "fields",
  "hills",
  "mountains",
  "gold",
  "desert",
  "sea",
]);

const portTypeSchema = z.enum([
  "generic",
  "wood",
  "wool",
  "grain",
  "brick",
  "ore",
]);

const cellSchema = z.object({
  q: z.number().int(),
  r: z.number().int(),
});

const portSchema = z.object({
  q: z.number().int(),
  r: z.number().int(),
  dq: z.number().int(),
  dr: z.number().int(),
});

const zoneSchema = z.object({
  name: z.string().max(MAX_NAME),
  cells: z.array(cellSchema).max(MAX_CELLS),
  terrainCounts: z.partialRecord(
    terrainSchema,
    z.number().int().min(0).max(MAX_TILES),
  ),
  numberTokens: z.array(z.number().int()).max(MAX_TILES),
  hidden: z.boolean().optional(),
  islands: z.tuple([z.number().int(), z.number().int()]).optional(),
  ports: z
    .object({
      slots: z.array(portSchema).max(MAX_CELLS).optional(),
      types: z.array(portTypeSchema).max(MAX_CELLS),
    })
    .optional(),
});

const staticSchema = z.object({
  cell: cellSchema,
  terrain: terrainSchema,
  number: z.number().int().optional(),
});

const boardSchema = z.object({
  players: z.array(z.number().int()).max(MAX_BOARDS),
  width: z.number().int().min(MIN_WIDTH).max(MAX_WIDTH).optional(),
  zones: z.array(zoneSchema).max(MAX_ZONES),
  statics: z.array(staticSchema).max(MAX_CELLS).optional(),
});

/**
 * The stored form of a {@link ScenarioSpec}. Typed against the interface, so a
 * field added to the format that isn't mirrored here fails to compile.
 */
export const scenarioSpecSchema: z.ZodType<ScenarioSpec> = z.object({
  name: z.string().max(MAX_NAME),
  targetScore: z.number().int(),
  boards: z.array(boardSchema).max(MAX_BOARDS),
});

/**
 * The spec a row carries, or `null` when it carries none or carries something
 * unusable. A malformed blob makes that one scenario fall back to the board the
 * generator ships in code — it never breaks the list it was read with.
 */
export function parseScenarioSpec(value: unknown): ScenarioSpec | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = scenarioSpecSchema.safeParse(value);

  return parsed.success ? parsed.data : null;
}
