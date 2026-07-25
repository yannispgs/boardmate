import { describe, expect, it } from "vitest";

import { hexCorners, polygonPoints } from "./hex-geometry";

describe("hexCorners", () => {
  it("draws six corners, all at the circumradius from the centre", () => {
    const corners = hexCorners(10, 20, 4);

    expect(corners).toHaveLength(6);

    for (const corner of corners) {
      expect(Math.hypot(corner.x - 10, corner.y - 20)).toBeCloseTo(4);
    }
  });

  it("starts at the top corner of a pointy-top hexagon", () => {
    const [top] = hexCorners(0, 0, 5);

    expect(top.x).toBeCloseTo(0);
    expect(top.y).toBeCloseTo(-5);
  });
});

describe("polygonPoints", () => {
  it("joins the points the way an SVG polygon reads them", () => {
    expect(
      polygonPoints([
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ]),
    ).toBe("1,2 3,4");
  });
});
