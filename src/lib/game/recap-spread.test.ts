import { describe, expect, it } from "vitest";

import { spread, standing, standingTone, topPercent } from "./recap-spread";

describe("spread", () => {
  it("places every party between the smallest and the largest", () => {
    const bar = spread([40, 60], 50, "highest");

    expect(bar).toEqual({
      left: 40,
      right: 60,
      marks: [0, 1],
      cursor: 0.5,
      anchor: null,
    });
  });

  it("puts this party at an end when this party is the end", () => {
    const low = spread([40, 60], 30, "highest");
    const high = spread([40, 60], 90, "highest");

    expect(low?.cursor).toBe(0);
    expect(low?.left).toBe(30);
    expect(high?.cursor).toBe(1);
    expect(high?.right).toBe(90);
  });

  // Every bar on the screen puts the good evening on the right, so a measure
  // the small figure wins runs backwards — labels and all.
  it("turns the bar around when the small figure is the good one", () => {
    const bar = spread([40, 60], 50, "lowest");

    expect(bar).toEqual({
      left: 60,
      right: 40,
      marks: [1, 0],
      cursor: 0.5,
      anchor: null,
    });
  });

  it("puts the best of a descending measure hard against the right end", () => {
    const bar = spread([40, 60], 30, "lowest");

    expect(bar?.cursor).toBe(1);
    expect(bar?.right).toBe(30);
  });

  // A share of the table's time has no good end, so there is nothing to point
  // the other way and the natural order stands.
  it("keeps the natural order on a measure with no good end", () => {
    const bar = spread([40, 60], 50, null);

    expect(bar?.left).toBe(40);
    expect(bar?.right).toBe(60);
  });

  it("has nothing to draw on a first party", () => {
    expect(spread([], 50, "highest")).toBeNull();
  });

  it("places the reference figure on the same scale as the parties", () => {
    const bar = spread([40, 60], 50, null, { value: 45, ceiling: 55 });

    expect(bar?.anchor?.at).toBe(0.25);
  });

  // The ramp is placed off the measure's own scale, not across the band: the
  // ceiling keeps its true place even when — as here, and on most real
  // histories — it falls well off the end of the bar.
  it("keeps the ramp on the scale, ceiling included, however far out it lands", () => {
    const bar = spread([75, 120], 114, null, { value: 100, ceiling: 160 });

    expect(bar?.anchor?.at).toBeCloseTo(0.5556, 4);
    expect(bar?.anchor?.ramp?.from).toBeCloseTo(0.5556, 4);
    expect(bar?.anchor?.ramp?.to).toBeCloseTo(1.8889, 4);
  });

  it("lets the ramp start off the bar too, when everything is past the reference", () => {
    const bar = spread([120, 150], 126, null, { value: 100, ceiling: 160 });

    // Pinned to the left end to be drawn, but the ramp keeps 100 where it
    // really is — a fifth of a bar-width before the bar starts — so 120 is
    // already a third of the way to full strength.
    expect(bar?.anchor?.at).toBe(0);
    expect(bar?.anchor?.ramp?.from).toBeCloseTo(-0.6667, 4);
    expect(bar?.anchor?.ramp?.to).toBeCloseTo(1.3333, 4);
  });

  // The whole reason the reference is clamped instead of scaled to. Both of
  // these are real histories: two parties at 52 and 56, and two at 111 and 127.
  // Widening the scale to hold 100 would squeeze the first pair into the
  // leftmost twelfth of the track, and comparing his parties to each other is
  // what the bar is for.
  it("pins a reference nothing reached to the end it is past", () => {
    const under = spread([52], 56, null, { value: 100, ceiling: 160 });
    const over = spread([111], 127, null, { value: 100, ceiling: 160 });

    expect(under?.anchor?.at).toBe(1);
    expect(under?.left).toBe(52);
    expect(under?.right).toBe(56);

    expect(over?.anchor?.at).toBe(0);
    expect(over?.left).toBe(111);
    expect(over?.right).toBe(127);
  });

  it("pins it to the other end when the bar runs backwards", () => {
    // On a descending scale the small figure is the right-hand end, so a
    // reference below everything is the one that lands on the right.
    const under = spread([52], 56, "lowest", { value: 100, ceiling: 160 });
    const over = spread([111], 127, "lowest", { value: 100, ceiling: 160 });

    expect(under?.anchor?.at).toBe(0);
    expect(over?.anchor?.at).toBe(1);
  });

  it("puts a reference every party landed on under the stack", () => {
    const bar = spread([100, 100], 100, null, { value: 100, ceiling: 160 });

    expect(bar?.anchor?.at).toBe(0.5);

    // Nothing ever moved, so there is no distance for a ramp to run over and
    // the band is left flat rather than given a made-up width to redden across.
    expect(bar?.anchor?.ramp).toBeNull();
  });

  it("still picks a side for a reference no party reached, with no width", () => {
    const anchor = { value: 100, ceiling: 160 };
    const under = spread([52, 52], 52, null, anchor);
    const over = spread([127, 127], 127, null, anchor);
    const backwards = spread([52, 52], 52, "lowest", anchor);

    expect(under?.anchor?.at).toBe(1);
    expect(over?.anchor?.at).toBe(0);
    expect(backwards?.anchor?.at).toBe(0);

    expect(under?.anchor?.ramp).toBeNull();
  });

  it("stacks a run of identical figures in the middle", () => {
    // Nothing ever moved, so there is no width to divide by — and the picture
    // of one mark under the cursor is the truthful one.
    const bar = spread([50, 50], 50, "highest");

    expect(bar).toEqual({
      left: 50,
      right: 50,
      marks: [0.5, 0.5],
      cursor: 0.5,
      anchor: null,
    });
  });
});

describe("topPercent", () => {
  it("reads a rank out of four as a quarter of the way down", () => {
    expect(topPercent(1, 4)).toBe(25);
    expect(topPercent(2, 4)).toBe(50);
    expect(topPercent(3, 4)).toBe(75);
    expect(topPercent(4, 4)).toBe(100);
  });

  it("rounds to the nearest whole percent", () => {
    // Three parties fall on thirds, which no percentage says exactly.
    expect(topPercent(1, 3)).toBe(33);
    expect(topPercent(2, 3)).toBe(67);
    expect(topPercent(3, 3)).toBe(100);
  });

  it("gets finer as the history gets longer", () => {
    expect(topPercent(1, 100)).toBe(1);
    expect(topPercent(7, 8)).toBe(88);
    expect(topPercent(8, 8)).toBe(100);
  });

  it("calls the better of two parties the top half", () => {
    expect(topPercent(1, 2)).toBe(50);
    expect(topPercent(2, 2)).toBe(100);
  });
});

describe("standing", () => {
  /** Eight other parties, all strictly between 20 and 90. */
  const middling = [30, 35, 40, 45, 50, 55, 60, 65];

  it("names the two ends of a player's own history", () => {
    expect(standing(1, 90, [40, 60], "highest")).toEqual({ kind: "best" });
    expect(standing(3, 20, [40, 60], "highest")).toEqual({ kind: "worst" });
  });

  it("reads the ends off the figures, so the low one wins when low is good", () => {
    expect(standing(1, 20, [40, 60], "lowest")).toEqual({ kind: "best" });
    expect(standing(3, 90, [40, 60], "lowest")).toEqual({ kind: "worst" });
  });

  it("counts a party tied for an end as being at that end", () => {
    // Two parties share the best figure, so this one carries rank 1 and the
    // other does too — « sa meilleure » is true of both.
    expect(standing(1, 60, [60, 40], "highest")).toEqual({ kind: "best" });

    // And at the other end the rank does not even reach the total: the two
    // parties tied for last share rank 2 out of 3, which is why the figures
    // rather than the rank decide.
    expect(standing(2, 40, [40, 60], "highest")).toEqual({ kind: "worst" });
  });

  it("calls a run of identical figures neither best nor worst", () => {
    expect(standing(1, 50, [50, 50], "highest")).toEqual({
      kind: "rank",
      rank: 1,
      total: 3,
    });
  });

  it("gives an exact rank up to ten parties", () => {
    expect(standing(4, 47, middling, "highest")).toEqual({
      kind: "rank",
      rank: 4,
      total: 9,
    });

    // Ten is still a rank; eleven is where « 7ᵉ sur 11 » stops being read.
    expect(standing(5, 47, [...middling, 70], "highest")).toEqual({
      kind: "rank",
      rank: 5,
      total: 10,
    });
  });

  it("switches to a percentage past ten parties", () => {
    expect(standing(6, 47, [...middling, 70, 75], "highest")).toEqual({
      kind: "percent",
      percent: 55,
    });
  });

  it("still names the ends however long the history is", () => {
    const long = [...middling, 70, 75, 80];

    expect(standing(1, 100, long, "highest")).toEqual({ kind: "best" });
    expect(standing(12, 10, long, "highest")).toEqual({ kind: "worst" });
  });
});

describe("standingTone", () => {
  it("colours the two ends whatever the arithmetic says", () => {
    // Three parties put his best in the top 33 %, which is outside the fifth —
    // and leaving « sa meilleure » grey is the one reading nobody would accept.
    expect(standingTone({ kind: "best" })).toBe("good");
    expect(standingTone({ kind: "worst" })).toBe("bad");
  });

  it("colours the top fifth of a rank and the bottom fifth", () => {
    expect(standingTone({ kind: "rank", rank: 1, total: 5 })).toBe("good");
    expect(standingTone({ kind: "rank", rank: 5, total: 5 })).toBe("bad");
  });

  it("leaves everything between the two fifths alone", () => {
    // 40 %, 60 % and 80 % — the last one sits exactly on the edge and stays
    // out, since « les 20 % pires » is the fifth below it.
    expect(standingTone({ kind: "rank", rank: 2, total: 5 })).toBe("neutral");
    expect(standingTone({ kind: "rank", rank: 3, total: 5 })).toBe("neutral");
    expect(standingTone({ kind: "rank", rank: 4, total: 5 })).toBe("neutral");
  });

  it("reads a percentage on the same two thresholds", () => {
    expect(standingTone({ kind: "percent", percent: 20 })).toBe("good");
    expect(standingTone({ kind: "percent", percent: 21 })).toBe("neutral");
    expect(standingTone({ kind: "percent", percent: 80 })).toBe("neutral");
    expect(standingTone({ kind: "percent", percent: 81 })).toBe("bad");
  });

  it("says nothing of a rank too short to have a fifth", () => {
    // Four parties: no rank falls in the top 20 %, so only the two ends are
    // ever coloured — which is exactly what the ends' own rule already does.
    expect(standingTone({ kind: "rank", rank: 1, total: 4 })).toBe("neutral");
    expect(standingTone({ kind: "rank", rank: 2, total: 4 })).toBe("neutral");
  });
});
