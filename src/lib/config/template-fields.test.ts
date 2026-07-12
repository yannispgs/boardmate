import { describe, expect, it } from "vitest";

import type { FieldSpec } from "@/lib/domain";
import {
  blankField,
  cleanTemplateFields,
  MONITOR_KEYS,
  TIMER_FIELDS,
} from "./template-fields";

describe("blankField", () => {
  it("makes an empty field of each scalar type", () => {
    expect(blankField("integer")).toEqual({
      key: "",
      label: "",
      type: "integer",
    });
    expect(blankField("number")).toEqual({
      key: "",
      label: "",
      type: "number",
    });
    expect(blankField("text")).toEqual({ key: "", label: "", type: "text" });
    expect(blankField("boolean")).toEqual({
      key: "",
      label: "",
      type: "boolean",
      default: false,
    });
    expect(blankField("enum")).toEqual({
      key: "",
      label: "",
      type: "enum",
      options: [],
    });
  });
});

describe("TIMER_FIELDS", () => {
  it("uses the exact keys the schedule reads", () => {
    expect(TIMER_FIELDS.map(f => f.key)).toEqual([
      MONITOR_KEYS.base,
      MONITOR_KEYS.step,
      MONITOR_KEYS.max,
    ]);
  });
});

describe("cleanTemplateFields", () => {
  it("trims keys/labels and keeps valid fields", () => {
    const fields: FieldSpec[] = [
      { key: " pts ", label: " Points ", type: "integer", default: 10 },
    ];

    expect(cleanTemplateFields(fields)).toEqual([
      { key: "pts", label: "Points", type: "integer", default: 10 },
    ]);
  });

  it("drops fields with no key or no label", () => {
    const fields: FieldSpec[] = [
      { key: "", label: "Sans clé", type: "text" },
      { key: "orphan", label: "  ", type: "text" },
      { key: "ok", label: "OK", type: "text" },
    ];

    expect(cleanTemplateFields(fields).map(f => f.key)).toEqual(["ok"]);
  });

  it("keeps the first of duplicate keys", () => {
    const fields: FieldSpec[] = [
      { key: "dup", label: "First", type: "integer" },
      { key: "dup", label: "Second", type: "integer" },
    ];

    const out = cleanTemplateFields(fields);
    expect(out).toHaveLength(1);
    expect(out[0].label).toBe("First");
  });

  it("cleans enum options and drops an enum with none left", () => {
    const fields: FieldSpec[] = [
      {
        key: "mode",
        label: "Mode",
        type: "enum",
        options: [
          { value: " solo ", label: " Solo " },
          { value: "", label: "vide" },
        ],
      },
      {
        key: "empty",
        label: "Vide",
        type: "enum",
        options: [{ value: "", label: "" }],
      },
    ];

    const out = cleanTemplateFields(fields);
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({
      key: "mode",
      label: "Mode",
      type: "enum",
      options: [{ value: "solo", label: "Solo" }],
    });
  });
});
