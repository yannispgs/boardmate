import { describe, expect, it } from "vitest";

import { newEditorKey } from "./editor-key";

describe("newEditorKey", () => {
  it("reads as a short hexadecimal key", () => {
    expect(newEditorKey()).toMatch(/^[0-9a-f]{8}$/);
  });

  it("never hands out the same key twice", () => {
    const keys = new Set(Array.from({ length: 100 }, newEditorKey));

    expect(keys.size).toBe(100);
  });
});
