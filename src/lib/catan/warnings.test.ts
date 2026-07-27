import { describe, expect, it } from "vitest";

import { RESOURCE_LABEL, warningText } from "./warnings";

describe("warningText", () => {
  it("labels every resource in French", () => {
    expect(Object.values(RESOURCE_LABEL)).toEqual([
      "bois",
      "argile",
      "laine",
      "blé",
      "minerai",
    ]);
  });

  it("agrees the intersection warning in number", () => {
    expect(
      warningText({
        kind: "intersectionTooStrong",
        worst: 13,
        max: 12,
        count: 1,
      }),
    ).toBe("1 intersection dépasse le plafond de 12 pastilles (jusqu'à 13).");

    expect(
      warningText({
        kind: "intersectionTooStrong",
        worst: 14,
        max: 12,
        count: 3,
      }),
    ).toBe(
      "3 intersections dépassent le plafond de 12 pastilles (jusqu'à 14).",
    );
  });

  it("reports a resource above the band with its whole-number cap", () => {
    expect(
      warningText({
        kind: "resourceBalance",
        resource: "grain",
        combos: 17,
        low: 13.6,
        high: 16.6,
      }),
    ).toBe(
      "La production de blé est trop forte (17 combinaisons, maximum 16).",
    );
  });

  it("reports a resource below the band with its whole-number floor", () => {
    expect(
      warningText({
        kind: "resourceBalance",
        resource: "ore",
        combos: 13,
        low: 13.6,
        high: 16.6,
      }),
    ).toBe(
      "La production de minerai est trop faible (13 combinaisons, minimum 14).",
    );
  });

  it("names the zone whose own band was missed", () => {
    expect(
      warningText({
        kind: "zoneBalance",
        zone: "Continent de départ",
        resource: "wood",
        combos: 4,
        low: 6.4,
        high: 9.6,
      }),
    ).toBe(
      "Zone « Continent de départ » : la production de bois est trop faible (4 combinaisons, minimum 7).",
    );
  });

  it("lists the resources of a harbour sitting on its own terrain", () => {
    expect(
      warningText({ kind: "portOnResource", resources: ["wood", "brick"] }),
    ).toBe(
      "Un port 2:1 est adjacent à une tuile de sa ressource (bois, argile).",
    );
  });
});
