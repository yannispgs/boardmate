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

/**
 * The space a point falls in — the exact inverse of {@link axialToPixel}, so a
 * finger dragged over the canvas can be turned into the hex under it without
 * asking the browser which element it is over. Touch never reports crossing
 * from one shape into the next: the first one touched keeps the whole gesture,
 * so painting a stretch has to be worked out from the coordinates.
 *
 * The undone division lands between three spaces; rounding is done in cube
 * coordinates (q, r and the implied third axis sum to zero) and the axis that
 * was rounded furthest is recomputed from the other two, which is what keeps
 * the answer inside the hexagon rather than in the diamond around its centre.
 */
export function pixelToAxial(
  x: number,
  y: number,
  size: number,
): { q: number; r: number } {
  const r = y / (1.5 * size);
  const q = x / (Math.sqrt(3) * size) - r / 2;
  const s = -q - r;

  let roundedQ = Math.round(q);
  let roundedR = Math.round(r);
  const roundedS = Math.round(s);
  const offQ = Math.abs(roundedQ - q);
  const offR = Math.abs(roundedR - r);
  const offS = Math.abs(roundedS - s);

  if (offQ > offR && offQ > offS) {
    roundedQ = -roundedR - roundedS;
  } else if (offR > offS) {
    roundedR = -roundedQ - roundedS;
  }

  // `Math.round` answers -0 just short of an axis, and "-0" is a different key
  // from "0" once a space is looked up by name. Adding zero folds it back.
  return { q: roundedQ + 0, r: roundedR + 0 };
}
