/**
 * The flat geometry every hex canvas shares — the drawn board and the scenario
 * editor alike. Coordinates come from {@link axialToPixel}; this turns a centre
 * into the polygon around it.
 */

/** A point in the SVG's own coordinate space. */
export interface HexPoint {
  x: number;
  y: number;
}

/**
 * The six corners of a pointy-top hexagon of circumradius `size` centred at
 * (cx, cy), starting at the top corner and going clockwise.
 */
export function hexCorners(cx: number, cy: number, size: number): HexPoint[] {
  const corners: HexPoint[] = [];

  for (let i = 0; i < 6; i++) {
    const angle = ((60 * i - 90) * Math.PI) / 180;

    corners.push({
      x: cx + size * Math.cos(angle),
      y: cy + size * Math.sin(angle),
    });
  }

  return corners;
}

/** Points in the form an SVG `<polygon>` reads them. */
export function polygonPoints(points: HexPoint[]): string {
  return points.map(p => `${p.x},${p.y}`).join(" ");
}
