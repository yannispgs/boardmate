import { describe, expect, it } from "vitest";
import { z } from "zod";

import type { FieldSpec } from "@/lib/domain";
import {
  buildDefaults,
  collectFieldErrors,
  validateConfigValues,
} from "./validation";

/** A realistic Catan-like template (the agreed v1 example). */
const catanTemplate: FieldSpec[] = [
  {
    key: "points_to_win",
    label: "Points pour gagner",
    type: "integer",
    min: 5,
    max: 20,
    default: 10,
  },
  {
    key: "longest_road",
    label: "Plus longue route",
    type: "boolean",
    default: true,
  },
  {
    key: "largest_army",
    label: "Plus grosse armée",
    type: "boolean",
    default: true,
  },
];

describe("validateConfigValues — scalar types", () => {
  it("accepts a valid Catan config", () => {
    const result = validateConfigValues(catanTemplate, {
      points_to_win: 10,
      longest_road: true,
      largest_army: false,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-integer where an integer is required", () => {
    const result = validateConfigValues(catanTemplate, {
      points_to_win: 10.5,
      longest_road: true,
      largest_army: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an integer below min / above max", () => {
    expect(
      validateConfigValues(catanTemplate, {
        points_to_win: 2,
        longest_road: true,
        largest_army: true,
      }).success,
    ).toBe(false);
    expect(
      validateConfigValues(catanTemplate, {
        points_to_win: 99,
        longest_road: true,
        largest_army: true,
      }).success,
    ).toBe(false);
  });

  it("rejects a string where a boolean is required", () => {
    const result = validateConfigValues(catanTemplate, {
      points_to_win: 10,
      longest_road: "yes",
      largest_army: true,
    });
    expect(result.success).toBe(false);
  });
});

describe("validateConfigValues — required vs optional", () => {
  const template: FieldSpec[] = [
    { key: "name", label: "Nom", type: "text" },
    { key: "note", label: "Note", type: "text", required: false },
  ];

  it("rejects a missing required field", () => {
    expect(validateConfigValues(template, { note: "x" }).success).toBe(false);
  });

  it("accepts an omitted optional field", () => {
    expect(validateConfigValues(template, { name: "Catan" }).success).toBe(
      true,
    );
  });
});

describe("validateConfigValues — text & enum constraints", () => {
  const template: FieldSpec[] = [
    { key: "label", label: "Label", type: "text", minLength: 2, maxLength: 5 },
    {
      key: "mode",
      label: "Mode",
      type: "enum",
      options: [
        { value: "solo", label: "Solo" },
        { value: "team", label: "Équipe" },
      ],
    },
  ];

  it("enforces text length bounds", () => {
    expect(
      validateConfigValues(template, { label: "a", mode: "solo" }).success,
    ).toBe(false);
    expect(
      validateConfigValues(template, { label: "toolong", mode: "solo" })
        .success,
    ).toBe(false);
    expect(
      validateConfigValues(template, { label: "ok", mode: "solo" }).success,
    ).toBe(true);
  });

  it("rejects an enum value outside the declared options", () => {
    expect(
      validateConfigValues(template, { label: "ok", mode: "duo" }).success,
    ).toBe(false);
  });
});

describe("validateConfigValues — recursive object & array (future-ready)", () => {
  const template: FieldSpec[] = [
    {
      key: "house_rules",
      label: "Règles maison",
      type: "object",
      fields: [
        { key: "enabled", label: "Activé", type: "boolean" },
        { key: "max", label: "Max", type: "integer", min: 0 },
      ],
    },
    {
      key: "expansions",
      label: "Extensions",
      type: "array",
      items: { key: "ext", label: "Extension", type: "text" },
      minItems: 1,
    },
  ];

  it("validates a nested object and a typed array", () => {
    const result = validateConfigValues(template, {
      house_rules: { enabled: true, max: 3 },
      expansions: ["seafarers", "cities"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a bad nested-object field type", () => {
    const result = validateConfigValues(template, {
      house_rules: { enabled: true, max: -1 },
      expansions: ["a"],
    });
    expect(result.success).toBe(false);
  });

  it("enforces array minItems and item types", () => {
    expect(
      validateConfigValues(template, {
        house_rules: { enabled: false, max: 0 },
        expansions: [],
      }).success,
    ).toBe(false);
    expect(
      validateConfigValues(template, {
        house_rules: { enabled: false, max: 0 },
        expansions: [42],
      }).success,
    ).toBe(false);
  });
});

describe("validateConfigValues — number type & array maxItems", () => {
  const template: FieldSpec[] = [
    { key: "ratio", label: "Ratio", type: "number", min: 0.5, max: 2.5 },
    {
      key: "tags",
      label: "Tags",
      type: "array",
      items: { key: "tag", label: "Tag", type: "text" },
      maxItems: 2,
    },
  ];

  it("accepts a fractional number within bounds and an array at the cap", () => {
    const result = validateConfigValues(template, {
      ratio: 1.5,
      tags: ["a", "b"],
    });

    expect(result.success).toBe(true);
  });

  it("rejects a number below min or above max", () => {
    expect(
      validateConfigValues(template, { ratio: 0.1, tags: [] }).success,
    ).toBe(false);

    expect(validateConfigValues(template, { ratio: 3, tags: [] }).success).toBe(
      false,
    );
  });

  it("rejects a non-number where a number is required", () => {
    expect(
      validateConfigValues(template, { ratio: "x", tags: [] }).success,
    ).toBe(false);
  });

  it("rejects an array above maxItems", () => {
    expect(
      validateConfigValues(template, {
        ratio: 1,
        tags: ["a", "b", "c"],
      }).success,
    ).toBe(false);
  });
});

describe("validateConfigValues — unconstrained fields & missing defaults", () => {
  // No min/max/minLength/maxLength/minItems/maxItems anywhere: exercises the
  // "constraint absent" side of every optional-bound branch.
  const template: FieldSpec[] = [
    { key: "i", label: "I", type: "integer" },
    { key: "n", label: "N", type: "number" },
    { key: "t", label: "T", type: "text" },
    {
      key: "a",
      label: "A",
      type: "array",
      items: { key: "x", label: "X", type: "text" },
    },
  ];

  it("accepts any in-type values when no bounds are declared", () => {
    const result = validateConfigValues(template, {
      i: 9999,
      n: -0.5,
      t: "",
      a: [],
    });

    expect(result.success).toBe(true);
  });

  it("omits fields whose default is undefined from buildDefaults", () => {
    const defaults = buildDefaults([
      { key: "note", label: "Note", type: "text" },
      { key: "pts", label: "Pts", type: "integer", default: 5 },
    ]);

    expect(defaults).toEqual({ pts: 5 });
    expect("note" in defaults).toBe(false);
  });
});

describe("buildDefaults", () => {
  it("applies declared defaults and the type fallbacks", () => {
    const template: FieldSpec[] = [
      { key: "pts", label: "Points", type: "integer", default: 10 },
      { key: "flag", label: "Flag", type: "boolean" },
      {
        key: "mode",
        label: "Mode",
        type: "enum",
        options: [
          { value: "a", label: "A" },
          { value: "b", label: "B" },
        ],
      },
      {
        key: "nested",
        label: "Nested",
        type: "object",
        fields: [{ key: "on", label: "On", type: "boolean", default: true }],
      },
      {
        key: "list",
        label: "List",
        type: "array",
        items: { key: "x", label: "X", type: "text" },
      },
    ];

    expect(buildDefaults(template)).toEqual({
      pts: 10,
      flag: false, // boolean fallback
      mode: "a", // first option
      nested: { on: true }, // recursive
      list: [], // arrays start empty
    });
  });

  it("produces defaults that pass their own validation", () => {
    const defaults = buildDefaults(catanTemplate);
    expect(validateConfigValues(catanTemplate, defaults).success).toBe(true);
  });
});

describe("collectFieldErrors", () => {
  it("keeps the first message per field key", () => {
    // Two invalid fields → one message each, keyed by field.
    const result = validateConfigValues(catanTemplate, {
      points_to_win: "nan",
      longest_road: "nope",
      largest_army: true,
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    const errors = collectFieldErrors(result.error);
    expect(Object.keys(errors)).toEqual(
      expect.arrayContaining(["points_to_win", "longest_road"]),
    );
    expect(typeof errors.points_to_win).toBe("string");
  });

  it("keeps only the first message per key and drops path-less issues", () => {
    // Two issues on the same key + one with an empty path (no field to attach).
    const error = new z.ZodError([
      { code: "custom", path: ["pts"], message: "first", input: undefined },
      { code: "custom", path: ["pts"], message: "second", input: undefined },
      { code: "custom", path: [], message: "root", input: undefined },
    ]);

    expect(collectFieldErrors(error)).toEqual({ pts: "first" });
  });
});
