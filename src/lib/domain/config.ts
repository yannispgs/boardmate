import type { BoardgameId, ConfigId } from "./ids";

/**
 * Schema-driven configuration system.
 *
 * Each boardgame has a fixed *template* describing which fields exist and their
 * types (a `FieldSpec[]`). Users then create *configs* by filling in values,
 * which are validated against the template in-app (no source code needed).
 *
 * `FieldSpec` is a **recursive** discriminated union: `object` and `array`
 * reference `FieldSpec` again, so nested/recursive configs can be supported
 * later without rearchitecting. v1 forms only render the scalar leaf types,
 * but the validator already handles the full recursive shape.
 */

interface FieldSpecBase {
  /** Stable key used in the stored `values` object. */
  key: string;
  /** Human label shown in the form. */
  label: string;
  description?: string;
  /** Defaults to `true`. Set `false` to make the field optional. */
  required?: boolean;
}

export interface IntegerFieldSpec extends FieldSpecBase {
  type: "integer";
  min?: number;
  max?: number;
  default?: number;
}

export interface NumberFieldSpec extends FieldSpecBase {
  type: "number";
  min?: number;
  max?: number;
  default?: number;
}

export interface TextFieldSpec extends FieldSpecBase {
  type: "text";
  minLength?: number;
  maxLength?: number;
  default?: string;
}

export interface BooleanFieldSpec extends FieldSpecBase {
  type: "boolean";
  default?: boolean;
  /**
   * Points this option adds to the score to reach when it's switched on
   * (Catan's « Maître du port » = +1). Additive and never negative — an option
   * may make the game longer to win, never shorter.
   */
  targetModifier?: number;
}

export interface EnumFieldSpec extends FieldSpecBase {
  type: "enum";
  options: { value: string; label: string }[];
  default?: string;
}

/** Future-ready (declared now, only basic UI later). */
export interface ObjectFieldSpec extends FieldSpecBase {
  type: "object";
  fields: FieldSpec[];
}

/** Future-ready, potentially recursive (an array of objects, etc.). */
export interface ArrayFieldSpec extends FieldSpecBase {
  type: "array";
  items: FieldSpec;
  minItems?: number;
  maxItems?: number;
}

export type FieldSpec =
  | IntegerFieldSpec
  | NumberFieldSpec
  | TextFieldSpec
  | BooleanFieldSpec
  | EnumFieldSpec
  | ObjectFieldSpec
  | ArrayFieldSpec;

export type FieldType = FieldSpec["type"];

/** Stored configuration values, keyed by `FieldSpec.key`. */
export type ConfigValues = Record<string, unknown>;

/** The fixed set of fields for a given boardgame. */
export interface ConfigTemplate {
  boardgameId: BoardgameId;
  fields: FieldSpec[];
}

/** A concrete, named configuration instance for a boardgame. */
export interface Config {
  id: ConfigId;
  boardgameId: BoardgameId;
  name: string;
  values: ConfigValues;
  createdAt: string;
}

export interface NewConfig {
  boardgameId: BoardgameId;
  name: string;
  values: ConfigValues;
}
