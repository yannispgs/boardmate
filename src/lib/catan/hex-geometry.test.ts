import { describe, expect, it } from "vitest";

import { axialToPixel } from "./board";
import { hexCorners, pixelToAxial, polygonPoints } from "./hex-geometry";

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

describe("pixelToAxial", () => {
  it("gives back the space a centre was drawn from", () => {
    for (let q = -4; q <= 4; q++) {
      for (let r = -4; r <= 4; r++) {
        const { x, y } = axialToPixel(q, r, 26);

        expect(pixelToAxial(x, y, 26)).toEqual({ q, r });
      }
    }
  });

  it("keeps a point near a corner in the space it belongs to", () => {
    // Every point strictly inside a hexagon answers that hexagon, corners
    // included — that is the whole difference between rounding in cube
    // coordinates and rounding q and r on their own, which would hand the
    // corners of a hexagon to the diamond-shaped region around its centre.
    for (const [q, r] of [
      [0, 0],
      [1, 0],
      [-1, 2],
      [2, -3],
    ]) {
      const centre = axialToPixel(q, r, 26);

      for (const corner of hexCorners(centre.x, centre.y, 26 * 0.92)) {
        expect(pixelToAxial(corner.x, corner.y, 26)).toEqual({ q, r });
      }
    }
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
