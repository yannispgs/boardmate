import {
  axialToPixel,
  type CatanBoard,
  type CatanPortType,
  type CatanTerrain,
  isRedNumber,
  pipCount,
} from "@/lib/catan/board";
import {
  hexCorners as cornersOf,
  type HexPoint,
  polygonPoints,
} from "@/lib/catan/hex-geometry";

const SIZE = 42; // hex circumradius in px

/** Long axis of the board: down the screen, or across it. */
export type BoardOrientation = "vertical" | "horizontal";

/** Tile colours, shared with the legend. */
export const TERRAIN_STYLE: Record<
  CatanTerrain,
  { fill: string; stroke: string }
> = {
  forest: { fill: "#2e7d46", stroke: "#1f5a31" },
  pasture: { fill: "#7cb342", stroke: "#5c8a2f" },
  fields: { fill: "#e5b731", stroke: "#b98f1f" },
  hills: { fill: "#c1673b", stroke: "#9a4f2b" },
  mountains: { fill: "#8a929c", stroke: "#69707a" },
  gold: { fill: "#7a8490", stroke: "#5f6975" },
  desert: { fill: "#e0cfa3", stroke: "#c3ac79" },
};

/**
 * The gold running through a gold-river tile. The tile itself is grey rock, as
 * on the printed one: only the river is gold, so a field — yellow from edge to
 * edge — can no longer be taken for it.
 */
export const GOLD_RIVER = "#f0c020";

/** Marins sea tiles: plain water, no terrain and no number. */
export const SEA_STYLE = { fill: "#2b6ca3", stroke: "#1d4f79" };

/** The back of a tile laid face down — nothing of it is known yet. */
export const HIDDEN_STYLE = { fill: "#4a5568", stroke: "#2d3748" };

const PORT_COLOR: Record<CatanPortType, string> = {
  generic: "#94a3b8",
  wood: "#2e7d46",
  wool: "#7cb342",
  grain: "#e5b731",
  brick: "#c1673b",
  ore: "#8a929c",
};

type Point = HexPoint;

/** The six corners of a board-sized hexagon centred at (cx, cy). */
function hexCorners(cx: number, cy: number): Point[] {
  return cornersOf(cx, cy, SIZE);
}

/** What a tile laid face down shows of itself: a question mark, and that's all. */
function Unknown({ centre }: Readonly<{ centre: Point }>) {
  return (
    <text
      x={centre.x}
      y={centre.y + 7}
      textAnchor="middle"
      fontSize={22}
      fontWeight="700"
      fill="#ffffff"
      opacity={0.7}
    >
      ?
    </text>
  );
}

/**
 * The band of gold crossing a gold-river tile, drawn straight across the middle
 * from one side to the other. Its half-width stops just inside the hex whichever
 * way the board is laid out, so the river reaches both edges without ever
 * spilling past them — and the number token, drawn after it, sits on top like
 * the printed tile's does.
 */
export function GoldRiver({
  centre,
  size,
}: Readonly<{ centre: Point; size: number }>) {
  return (
    <rect
      x={centre.x - size * 0.86}
      y={centre.y - size * 0.21}
      width={size * 1.72}
      height={size * 0.42}
      fill={GOLD_RIVER}
      className="pointer-events-none"
    />
  );
}

/**
 * What sits at the centre of a hex: nothing revealed yet, a plain disc for a
 * numberless hex (desert, sea), or the number token with its probability dots.
 */
function NumberToken({
  centre,
  hidden,
  n,
}: Readonly<{
  centre: { x: number; y: number };
  hidden: boolean;
  n: number | null;
}>) {
  if (hidden) {
    return <Unknown centre={centre} />;
  }

  if (n === null) {
    return (
      <circle cx={centre.x} cy={centre.y} r={7} fill="#4b5563" opacity={0.85} />
    );
  }

  return (
    <>
      <circle
        cx={centre.x}
        cy={centre.y}
        r={14}
        fill="#faf7ef"
        stroke="#0000001a"
      />
      <text
        x={centre.x}
        y={centre.y + 1}
        textAnchor="middle"
        fontSize={15}
        fontWeight="700"
        fill={isRedNumber(n) ? "#c62828" : "#27272a"}
      >
        {n}
      </text>
      <Pips cx={centre.x} cy={centre.y + 9} n={n} />
    </>
  );
}

/** Small probability dots under a number token (5 = most likely). */
function Pips({ cx, cy, n }: Readonly<{ cx: number; cy: number; n: number }>) {
  const count = pipCount(n);
  const gap = 3.4;
  const start = cx - ((count - 1) * gap) / 2;
  const fill = isRedNumber(n) ? "#c62828" : "#3f3f46";
  const xs = Array.from({ length: count }, (_, i) => start + i * gap);

  return (
    <>
      {xs.map(x => (
        <circle key={x} cx={x} cy={cy} r={1.1} fill={fill} />
      ))}
    </>
  );
}

const PORT_R = 11; // harbour marker radius

/**
 * Renders a generated Catan board as an SVG: coloured terrain hexes with their
 * number tokens (6 and 8 in red, with probability pips), the robber on each
 * desert, and the harbours on the coast (2:1 resource ports coloured, 3:1
 * generic ports grey). Purely presentational.
 *
 * `orientation` rotates the whole board 90° ("horizontal" lays its long axis
 * across the screen) while keeping the number tokens and port labels upright —
 * the geometry is rotated, the glyphs are not.
 */
export function CatanBoardSvg({
  board,
  orientation = "vertical",
}: Readonly<{
  board: CatanBoard;
  orientation?: BoardOrientation;
}>) {
  // Rotate every drawn coordinate 90° for the horizontal layout; number/port
  // labels are anchored at rotated points but drawn upright, so they stay
  // readable either way.
  const tf = (p: Point): Point =>
    orientation === "horizontal" ? { x: p.y, y: -p.x } : p;

  const rawCentres = board.hexes.map(h => axialToPixel(h.q, h.r, SIZE));
  const centres = rawCentres.map(tf);

  // Marins sea tiles, drawn first so the land and the harbours sit on top.
  const seaCorners = board.sea.map(s => {
    const c = axialToPixel(s.q, s.r, SIZE);

    return hexCorners(c.x, c.y).map(tf);
  });

  // Harbours: anchor pushed off the coast into the sea, with two dock lines
  // back to the edge's corners. Computed in raw space, then rotated.
  const ports = board.ports.map(port => {
    const c = rawCentres[port.hexId];
    const o = axialToPixel(
      board.hexes[port.hexId].q + port.dq,
      board.hexes[port.hexId].r + port.dr,
      SIZE,
    );
    const mid = { x: (c.x + o.x) / 2, y: (c.y + o.y) / 2 };
    const nx = mid.x - c.x;
    const ny = mid.y - c.y;
    const len = Math.hypot(nx, ny);
    const anchor = tf({
      x: mid.x + (nx / len) * 13,
      y: mid.y + (ny / len) * 13,
    });
    const ends = hexCorners(c.x, c.y)
      .map(p => ({ p, d: (p.x - mid.x) ** 2 + (p.y - mid.y) ** 2 }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 2)
      .map(e => tf(e.p));

    return { port, anchor, ends };
  });

  // Bounds from hex corners and the harbour markers.
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const stretch = (x: number, y: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };

  const corners = board.hexes.map(h =>
    hexCorners(rawCentres[h.id].x, rawCentres[h.id].y).map(tf),
  );

  for (const hexCorner of [...corners, ...seaCorners]) {
    for (const p of hexCorner) {
      stretch(p.x, p.y);
    }
  }
  for (const p of ports) {
    stretch(p.anchor.x - PORT_R, p.anchor.y - PORT_R);
    stretch(p.anchor.x + PORT_R, p.anchor.y + PORT_R);
  }

  const pad = SIZE * 0.5;
  const vb = [
    minX - pad,
    minY - pad,
    maxX - minX + pad * 2,
    maxY - minY + pad * 2,
  ].join(" ");

  return (
    <svg
      viewBox={vb}
      role="img"
      aria-label="Plateau de Catan généré"
      className="h-auto w-full max-w-md"
    >
      {board.sea.map((s, i) => {
        const t = s.hidden ? HIDDEN_STYLE : SEA_STYLE;

        return (
          <g key={s.id}>
            <polygon
              points={polygonPoints(seaCorners[i])}
              fill={t.fill}
              stroke={t.stroke}
              strokeWidth={2}
              strokeLinejoin="round"
            />
            {s.hidden ? (
              <Unknown centre={tf(axialToPixel(s.q, s.r, SIZE))} />
            ) : null}
          </g>
        );
      })}

      {board.hexes.map(h => {
        const c = centres[h.id];
        const points = polygonPoints(corners[h.id]);
        const t = h.hidden ? HIDDEN_STYLE : TERRAIN_STYLE[h.terrain];

        return (
          <g key={h.id}>
            <polygon
              points={points}
              fill={t.fill}
              stroke={t.stroke}
              strokeWidth={2}
              strokeLinejoin="round"
            />
            {h.terrain === "gold" && !h.hidden ? (
              <GoldRiver centre={c} size={SIZE} />
            ) : null}
            <NumberToken centre={c} hidden={h.hidden} n={h.number} />
          </g>
        );
      })}

      {/* Harbours drawn on top, sitting in the sea with two docks to the coast. */}
      {ports.map(({ port, anchor, ends }) => (
        <g key={`${port.hexId}-${port.dq}-${port.dr}`}>
          {ends.map(e => (
            <line
              key={`${e.x},${e.y}`}
              x1={anchor.x}
              y1={anchor.y}
              x2={e.x}
              y2={e.y}
              stroke="#a16207"
              strokeWidth={1.5}
            />
          ))}
          <circle
            cx={anchor.x}
            cy={anchor.y}
            r={PORT_R}
            fill={PORT_COLOR[port.type]}
            stroke="#00000055"
            strokeWidth={1}
          />
          <text
            x={anchor.x}
            y={anchor.y + 2.6}
            textAnchor="middle"
            fontSize={8}
            fontWeight="700"
            fill="#ffffff"
            stroke="#00000099"
            strokeWidth={0.7}
            paintOrder="stroke"
          >
            {port.type === "generic" ? "3:1" : "2:1"}
          </text>
        </g>
      ))}
    </svg>
  );
}
