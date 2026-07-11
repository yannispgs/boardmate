import { describe, expect, it } from "vitest";

import type { FieldSpec } from "@/lib/domain";
import { applyDefaults, withFieldDefault } from "./apply-defaults";

const integer: FieldSpec = {
  key: "n",
  label: "N",
  type: "integer",
  default: 1,
};
const number: FieldSpec = { key: "x", label: "X", type: "number", default: 0 };
const text: FieldSpec = { key: "t", label: "T", type: "text", default: "a" };
const boolean: FieldSpec = { key: "b", label: "B", type: "boolean" };
const enumField: FieldSpec = {
  key: "e",
  label: "E",
  type: "enum",
  options: [
    { value: "one", label: "Un" },
    { value: "two", label: "Deux" },
  ],
};
const object: FieldSpec = { key: "o", label: "O", type: "object", fields: [] };
const array: FieldSpec = {
  key: "a",
  label: "A",
  type: "array",
  items: integer,
};

describe("withFieldDefault", () => {
  it("sets a matching-typed default per scalar field", () => {
    expect(withFieldDefault(integer, 12)).toMatchObject({ default: 12 });
    expect(withFieldDefault(number, 3.5)).toMatchObject({ default: 3.5 });
    expect(withFieldDefault(text, "hello")).toMatchObject({ default: "hello" });
    expect(withFieldDefault(boolean, true)).toMatchObject({ default: true });
    expect(withFieldDefault(enumField, "two")).toMatchObject({
      default: "two",
    });
  });

  it("drops the default when the value's type doesn't match the field", () => {
    expect(withFieldDefault(integer, "nope")).toMatchObject({
      default: undefined,
    });
    expect(withFieldDefault(text, 5)).toMatchObject({ default: undefined });
    expect(withFieldDefault(enumField, 5)).toMatchObject({
      default: undefined,
    });
    expect(withFieldDefault(boolean, "yes")).toMatchObject({
      default: undefined,
    });
  });

  it("leaves object and array fields untouched (no scalar default)", () => {
    expect(withFieldDefault(object, { anything: 1 })).toBe(object);
    expect(withFieldDefault(array, [1, 2])).toBe(array);
  });
});

describe("applyDefaults", () => {
  it("rewrites only the fields named in the defaults map", () => {
    const fields = [integer, boolean, text];
    const out = applyDefaults(fields, { n: 20, b: true });

    expect(out.find(f => f.key === "n")).toMatchObject({ default: 20 });
    expect(out.find(f => f.key === "b")).toMatchObject({ default: true });
    // `t` is absent from the map → untouched (same reference, same default).
    expect(out.find(f => f.key === "t")).toBe(text);
  });
});
