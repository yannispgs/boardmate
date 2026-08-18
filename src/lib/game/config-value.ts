/**
 * Reading one setting out of a game's configuration.
 *
 * A value can come from three places, in order: what the table actually
 * confirmed for this game, else the default the boardgame's config template
 * carries, else a hard fallback for a game configured before the field existed.
 * The turn schedule has walked that ladder since the beginning; the draft
 * variant now walks the same one, so it lives here rather than being written a
 * second time.
 *
 * Pure: no vendor types, unit-tested.
 */

import type { ConfigValues, FieldSpec } from "@/lib/domain";

/** The template's declared default for a field, or `undefined`. */
function templateDefault(
  key: string,
  templateFields: FieldSpec[],
): unknown | undefined {
  const spec = templateFields.find(f => f.key === key);

  return spec && "default" in spec
    ? (spec as { default?: unknown }).default
    : undefined;
}

/** A number from the config value, else the template default, else `fallback`. */
export function resolveNumber(
  key: string,
  configValues: ConfigValues | null | undefined,
  templateFields: FieldSpec[],
  fallback: number,
): number {
  const fromConfig = configValues?.[key];

  if (typeof fromConfig === "number") {
    return fromConfig;
  }

  const def = templateDefault(key, templateFields);

  return typeof def === "number" ? def : fallback;
}

/**
 * A flag from the config value, else the template default, else `fallback`.
 *
 * The ladder matters more here than for a number: a game launched before the
 * draft field existed has no value for it at all, and must read as « not
 * drafted » rather than as nothing — which is what the fallback is for.
 */
export function resolveFlag(
  key: string,
  configValues: ConfigValues | null | undefined,
  templateFields: FieldSpec[],
  fallback: boolean,
): boolean {
  const fromConfig = configValues?.[key];

  if (typeof fromConfig === "boolean") {
    return fromConfig;
  }

  const def = templateDefault(key, templateFields);

  return typeof def === "boolean" ? def : fallback;
}
