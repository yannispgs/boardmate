import { describe, expect, it } from "vitest";

import type { FieldSpec } from "@/lib/domain";
import { configRecap } from "./config-recap";

const FIELDS: FieldSpec[] = [
  { key: "target", label: "Score à atteindre", type: "integer", min: 1 },
  { key: "harbour", label: "Maître du port", type: "boolean" },
  {
    key: "variant",
    label: "Variante",
    type: "enum",
    options: [
      { value: "base", label: "Classique" },
      { value: "fast", label: "Rapide" },
    ],
  },
  { key: "note", label: "Note", type: "text" },
];

describe("configRecap", () => {
  it("prints each attribute against its label, in the template's order", () => {
    const lines = configRecap(FIELDS, {
      target: 10,
      harbour: true,
      variant: "fast",
      note: "table du salon",
    });

    expect(lines.map(l => l.label)).toEqual([
      "Score à atteindre",
      "Maître du port",
      "Variante",
      "Note",
    ]);
    expect(lines.map(l => l.value)).toEqual([
      "10",
      "Oui",
      "Rapide",
      "table du salon",
    ]);
  });

  // « Maître du port non » is something the table agreed to; a missing value is
  // not. The two are the same falsy thing in JavaScript and opposites here.
  it("keeps a switch left off, which is an answer, unlike an absent one", () => {
    const lines = configRecap(FIELDS, { harbour: false });

    expect(lines).toEqual([
      { key: "harbour", label: "Maître du port", value: "Non" },
    ]);
  });

  it("leaves out what the party carries no value for", () => {
    const lines = configRecap(FIELDS, { target: 10 });

    expect(lines).toHaveLength(1);
    expect(lines[0].key).toBe("target");
  });

  it("says nothing at all about a party with no configuration", () => {
    expect(configRecap(FIELDS, null)).toEqual([]);
  });

  // The stored value is still what that party was played on, so it prints as
  // itself rather than vanishing from a recap that claims to be complete.
  it("falls back on the raw value when an option left the template", () => {
    const lines = configRecap(FIELDS, { variant: "retired" });

    expect(lines[0].value).toBe("retired");

    expect(configRecap(FIELDS, { variant: 3 })[0].value).toBe("3");
  });

  // Falling back has a floor: a value with no reading of its own would print as
  // « [object Object] », which says less against an attribute than saying
  // nothing at all.
  it("drops a retired option that reads as nothing", () => {
    expect(configRecap(FIELDS, { variant: { value: "retired" } })).toEqual([]);
  });

  it("drops a value stored under the wrong type rather than printing it", () => {
    const lines = configRecap(FIELDS, { target: "dix", note: "" });

    expect(lines).toEqual([]);
  });

  // Declared for later, set by no screen: rendering one would be a guess at a
  // shape nobody has authored yet.
  it("stays silent on the field types no screen fills in", () => {
    const later: FieldSpec[] = [
      { key: "seats", label: "Sièges", type: "object", fields: [] },
      {
        key: "rounds",
        label: "Manches",
        type: "array",
        items: { key: "n", label: "n", type: "integer" },
      },
    ];

    expect(configRecap(later, { seats: {}, rounds: [1, 2] })).toEqual([]);
  });
});
