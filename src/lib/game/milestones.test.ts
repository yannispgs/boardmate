import { describe, expect, it } from "vitest";

import type { MilestoneClaim, MilestoneSpec, PlayerId } from "@/lib/domain";
import {
  milestonePoints,
  milestonePrefill,
  milestoneRows,
  milestonesLeft,
} from "./milestones";

const ANA = "ana" as PlayerId;
const BEN = "ben" as PlayerId;

const SPEC: MilestoneSpec = {
  label: "Jalon",
  points: 5,
  max: 3,
  scoreKey: "jalons",
  catalogue: [
    {
      key: "terraformeur",
      label: "Terraformeur",
      hint: "NT d'au moins 35",
      icon: "terraforming",
      color: "#e2703a",
    },
    {
      key: "maire",
      label: "Maire",
      hint: "Posséder 3 cités",
      icon: "pas-un",
      color: "red; background: url(x)",
    },
    { key: "jardinier", label: "Jardinier", hint: "Posséder 3 espaces verts" },
    { key: "batisseur", label: "Bâtisseur", hint: "8 tags Construction" },
    { key: "planificateur", label: "Planificateur", hint: "16 cartes en main" },
  ],
};

/** The same spec, with one milestone wearing the colour under test. */
function shortHex(color: string): MilestoneSpec {
  return {
    ...SPEC,
    catalogue: [{ key: "seul", label: "Seul", hint: "—", icon: "star", color }],
  };
}

function claim(playerId: PlayerId, milestoneKey: string): MilestoneClaim {
  return { playerId, milestoneKey, stage: 1 };
}

describe("milestoneRows", () => {
  it("offers every milestone of the catalogue, in the rulebook's order", () => {
    const rows = milestoneRows(SPEC, []);

    expect(rows.map(r => r.key)).toEqual([
      "terraformeur",
      "maire",
      "jardinier",
      "batisseur",
      "planificateur",
    ]);
    expect(rows.every(r => r.open)).toBe(true);
    expect(rows.every(r => r.claimedBy === null)).toBe(true);
  });

  it("carries each milestone's name and condition through", () => {
    const [first] = milestoneRows(SPEC, []);

    expect(first.label).toBe("Terraformeur");
    expect(first.hint).toBe("NT d'au moins 35");
    expect(first.icon).toBe("terraforming");
    expect(first.color).toBe("#e2703a");
  });

  it("drops a drawing the app doesn't ship, rather than rendering a hole", () => {
    const rows = milestoneRows(SPEC, []);

    expect(rows.find(r => r.key === "maire")?.icon).toBeNull();
    expect(rows.find(r => r.key === "jardinier")?.icon).toBeNull();
  });

  it("lets nothing but a plain hex colour reach the panel", () => {
    const rows = milestoneRows(SPEC, []);

    // The catalogue is JSONB, so it can hold anything a hand-edited row left.
    expect(rows.find(r => r.key === "maire")?.color).toBeNull();
    expect(rows.find(r => r.key === "jardinier")?.color).toBeNull();
    expect(milestoneRows(shortHex("#0a0"), [])[0].color).toBe("#0a0");
    expect(milestoneRows(shortHex("#gggggg"), [])[0].color).toBeNull();
    expect(milestoneRows(shortHex("rebeccapurple"), [])[0].color).toBeNull();
  });

  it("names the claimer and closes what is taken", () => {
    const rows = milestoneRows(SPEC, [claim(ANA, "maire")]);
    const maire = rows.find(r => r.key === "maire");

    expect(maire?.claimedBy).toBe(ANA);
    expect(maire?.open).toBe(false);
  });

  it("leaves the others open while the game has claims left", () => {
    const rows = milestoneRows(SPEC, [claim(ANA, "maire")]);

    expect(rows.filter(r => r.open)).toHaveLength(4);
  });

  it("closes every free milestone once the last claim is spent", () => {
    const rows = milestoneRows(SPEC, [
      claim(ANA, "maire"),
      claim(BEN, "jardinier"),
      claim(ANA, "batisseur"),
    ]);

    expect(rows.filter(r => r.open)).toHaveLength(0);
    // Taken is not the same as closed-because-full: the claimers are still read.
    expect(rows.filter(r => r.claimedBy !== null)).toHaveLength(3);
  });

  it("stays closed if more claims exist than the rules allow", () => {
    const rows = milestoneRows(SPEC, [
      claim(ANA, "maire"),
      claim(BEN, "jardinier"),
      claim(ANA, "batisseur"),
      claim(BEN, "terraformeur"),
    ]);

    expect(rows.filter(r => r.open)).toHaveLength(0);
  });

  it("ignores a claim on a milestone the catalogue no longer offers", () => {
    const rows = milestoneRows(SPEC, [claim(ANA, "hellas-generateur")]);

    expect(rows.filter(r => r.claimedBy !== null)).toHaveLength(0);
    // It still counts against the game's total: it was really taken.
    expect(rows.filter(r => r.open)).toHaveLength(5);
  });
});

describe("milestonesLeft", () => {
  it("counts the whole allowance before anything is taken", () => {
    expect(milestonesLeft(SPEC, [])).toBe(3);
  });

  it("counts down as they go", () => {
    expect(milestonesLeft(SPEC, [claim(ANA, "maire")])).toBe(2);
  });

  it("never goes below zero", () => {
    const claims = [
      claim(ANA, "maire"),
      claim(BEN, "jardinier"),
      claim(ANA, "batisseur"),
      claim(BEN, "terraformeur"),
    ];

    expect(milestonesLeft(SPEC, claims)).toBe(0);
  });
});

describe("milestonePoints", () => {
  it("gives nobody anything when nothing is claimed", () => {
    expect(milestonePoints(SPEC, [])).toEqual(new Map());
  });

  it("pays each milestone at the spec's rate", () => {
    const points = milestonePoints(SPEC, [claim(ANA, "maire")]);

    expect(points.get(ANA)).toBe(5);
  });

  it("adds up a player's milestones", () => {
    const points = milestonePoints(SPEC, [
      claim(ANA, "maire"),
      claim(ANA, "batisseur"),
      claim(BEN, "jardinier"),
    ]);

    expect(points.get(ANA)).toBe(10);
    expect(points.get(BEN)).toBe(5);
  });

  it("leaves out a player holding none, rather than paying them zero", () => {
    const points = milestonePoints(SPEC, [claim(ANA, "maire")]);

    expect(points.has(BEN)).toBe(false);
  });
});

describe("milestonePrefill", () => {
  it("fills nothing when nothing was recorded", () => {
    expect(milestonePrefill(SPEC, [])).toEqual({});
  });

  it("writes each claimer's total under the sheet's milestone line", () => {
    const prefill = milestonePrefill(SPEC, [
      claim(ANA, "maire"),
      claim(ANA, "batisseur"),
      claim(BEN, "jardinier"),
    ]);

    expect(prefill).toEqual({
      [ANA]: { jalons: "10" },
      [BEN]: { jalons: "5" },
    });
  });

  it("follows the spec's own key, so a reworded sheet still lands", () => {
    const renamed = { ...SPEC, scoreKey: "milestones" };
    const prefill = milestonePrefill(renamed, [claim(ANA, "maire")]);

    expect(prefill[ANA]).toEqual({ milestones: "5" });
  });
});
