"use client";

import { useEffect, useRef, useState } from "react";

import { SEA_STYLE, TERRAIN_STYLE } from "@/components/catan/CatanBoardSvg";
import { axialToPixel } from "@/lib/catan/board";
import {
  hexCorners,
  pixelToAxial,
  polygonPoints,
} from "@/lib/catan/hex-geometry";
import { canvasGrid, cellOwner, pinsPortOn } from "@/lib/catan/scenario-draft";
import {
  cellKey,
  pinnedSlots,
  portEdges,
  type ScenarioBoardSpec,
  type SpecCell,
  type SpecPort,
} from "@/lib/catan/scenario-spec";

const SIZE = 26; // hex circumradius in px

/** Zone colours, picked to stay apart from one another and from the terrains. */
const ZONE_FILL = [
  "#6366f1",
  "#0ea5e9",
  "#f97316",
  "#a855f7",
  "#14b8a6",
  "#e11d48",
  "#84cc16",
  "#eab308",
];

/** The colour zone number `index` is painted in. */
export function zoneColor(index: number): string {
  return ZONE_FILL[index % ZONE_FILL.length];
}

/** What a click on the canvas does. */
export type CanvasTool = "paint" | "erase" | "static" | "port";

/** How a space is filled in: the zone that holds it, its terrain, or nothing. */
function cellFill(
  board: ScenarioBoardSpec,
  cell: SpecCell,
  activeZone: number,
): { fill: string; opacity: number; label: string | null } {
  const owner = cellOwner(board, cell);

  if (owner === null) {
    return { fill: "#94a3b8", opacity: 0.16, label: null };
  }

  if (owner.kind === "static") {
    const style =
      owner.tile.terrain === "sea"
        ? SEA_STYLE
        : TERRAIN_STYLE[owner.tile.terrain];

    return {
      fill: style.fill,
      opacity: 1,
      label: owner.tile.number === undefined ? "·" : String(owner.tile.number),
    };
  }

  return {
    fill: zoneColor(owner.zone),
    // The zone being edited stands out; the others stay readable behind it.
    opacity: owner.zone === activeZone ? 0.95 : 0.4,
    label: board.zones[owner.zone].hidden ? "?" : String(owner.zone + 1),
  };
}

/**
 * The paintable map of one board: the fixed Marins outline at the board's
 * width, coloured by whatever holds them. Tapping a space applies the current
 * tool, and sliding — mouse or finger — applies it to every space crossed. In
 * `port` mode a tap selects a space instead, and the six edges around it become
 * the harbour slots to pin or unpin.
 */
export function ScenarioCanvas({
  board,
  width,
  activeZone,
  tool,
  selected,
  onCell,
  onPort,
}: Readonly<{
  board: ScenarioBoardSpec;
  width: number;
  activeZone: number;
  tool: CanvasTool;
  /** The space whose harbour edges are on show, in `port` mode. */
  selected: SpecCell | null;
  onCell: (cell: SpecCell) => void;
  onPort: (port: SpecPort) => void;
}>) {
  const [drawing, setDrawing] = useState(false);
  // The space the stroke last applied the tool to, so sliding across one space
  // rebuilds the scenario once instead of on every pointer report.
  const last = useRef<string | null>(null);

  useEffect(() => {
    const stop = () => {
      setDrawing(false);
      last.current = null;
    };

    window.addEventListener("pointerup", stop);

    return () => {
      window.removeEventListener("pointerup", stop);
    };
  }, []);

  const cells = canvasGrid(width);
  const painted = new Set(cells.map(cellKey));

  function start(cell: SpecCell) {
    setDrawing(true);
    last.current = cellKey(cell);
    onCell(cell);
  }

  /**
   * Carries the stroke on, one space at a time. The hex is worked out from the
   * pointer's own coordinates rather than from what it is over: a touch hands
   * the whole gesture to the shape it started on, so no shape after that one
   * ever hears the finger arrive.
   */
  function extend(event: React.PointerEvent<SVGSVGElement>) {
    if (!drawing || tool === "port") {
      return;
    }

    // Null only on an SVG that is not being displayed at all.
    const screen = event.currentTarget.getScreenCTM();

    if (screen === null) {
      return;
    }

    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
      screen.inverse(),
    );
    const cell = pixelToAxial(point.x, point.y, SIZE);
    const key = cellKey(cell);

    // Off the board, or still on the space the stroke last painted.
    if (!painted.has(key) || key === last.current) {
      return;
    }

    last.current = key;
    onCell(cell);
  }
  const centres = new Map(
    cells.map(cell => [cellKey(cell), axialToPixel(cell.q, cell.r, SIZE)]),
  );

  // Every harbour the map pins, whichever bag holds it — a zone's, or the
  // board's own for the ones sitting on a fixed coast.
  const edges: SpecPort[] = [...pinnedSlots(board)];
  const pinned = new Set(
    edges.map(slot => `${cellKey(slot)}:${slot.dq},${slot.dr}`),
  );
  // What a space still offers in `port` mode: its coastal edges — land on this
  // side, open water on the other, in every draw — and none at all once it
  // carries a harbour, since a tile bears one. A space offering nothing does not
  // even take a tap, so no harbour can be pinned somewhere only to be reported
  // as an error afterwards.
  const offers = (cell: SpecCell): SpecPort[] => {
    if (pinsPortOn(board, cell)) {
      return [];
    }

    return portEdges(board, cell);
  };

  // Pinned harbours stay on show throughout, so unpinning one never needs its
  // space selected; the free edges are only drawn around the selected space.
  if (selected !== null && tool === "port") {
    edges.push(...offers(selected));
  }

  const bounds = cells.flatMap(cell => {
    const centre = centres.get(cellKey(cell));

    /* c8 ignore next -- every drawn space has a centre; this satisfies the map */
    return centre ? hexCorners(centre.x, centre.y, SIZE) : [];
  });
  const xs = bounds.map(p => p.x);
  const ys = bounds.map(p => p.y);
  const pad = SIZE * 0.6;
  const viewBox = [
    Math.min(...xs) - pad,
    Math.min(...ys) - pad,
    Math.max(...xs) - Math.min(...xs) + pad * 2,
    Math.max(...ys) - Math.min(...ys) + pad * 2,
  ].join(" ");

  return (
    <svg
      viewBox={viewBox}
      role="img"
      aria-label="Plan du scénario"
      className="h-auto w-full touch-none select-none"
      onPointerMove={extend}
    >
      <title>Plan du scénario</title>
      {cells.map(cell => {
        const centre = centres.get(cellKey(cell));

        /* c8 ignore next 3 -- same map lookup as above, always a hit */
        if (centre === undefined) {
          return null;
        }

        const { fill, opacity, label } = cellFill(board, cell, activeZone);
        const isSelected =
          selected !== null && cellKey(selected) === cellKey(cell);
        const takesTap = tool !== "port" || offers(cell).length > 0;

        return (
          <g key={cellKey(cell)}>
            <polygon
              points={polygonPoints(hexCorners(centre.x, centre.y, SIZE))}
              fill={fill}
              fillOpacity={opacity}
              stroke={isSelected ? "#111827" : "#64748b"}
              strokeWidth={isSelected ? 3 : 1}
              className={takesTap ? "cursor-pointer" : "cursor-not-allowed"}
              onPointerDown={() => {
                if (takesTap) {
                  start(cell);
                }
              }}
            />
            {label === null ? null : (
              <text
                x={centre.x}
                y={centre.y + 5}
                textAnchor="middle"
                fontSize={14}
                fontWeight="700"
                fill="#ffffff"
                stroke="#00000055"
                strokeWidth={0.6}
                paintOrder="stroke"
                className="pointer-events-none"
              >
                {label}
              </text>
            )}
          </g>
        );
      })}

      {edges.map(port => {
        const centre = axialToPixel(port.q, port.r, SIZE);
        const beyond = axialToPixel(port.q + port.dq, port.r + port.dr, SIZE);
        const x = (centre.x + beyond.x) / 2;
        const y = (centre.y + beyond.y) / 2;
        const isPinned = pinned.has(`${cellKey(port)}:${port.dq},${port.dr}`);

        return (
          <circle
            key={`${cellKey(port)}:${port.dq},${port.dr}`}
            cx={x}
            cy={y}
            r={7}
            fill={isPinned ? "#a16207" : "#ffffff"}
            fillOpacity={isPinned ? 1 : 0.75}
            stroke="#a16207"
            strokeWidth={1.5}
            strokeDasharray={isPinned ? undefined : "2 2"}
            className="cursor-pointer"
            onPointerDown={event => {
              // The space underneath would otherwise be painted as well.
              event.stopPropagation();
              onPort(port);
            }}
          />
        );
      })}
    </svg>
  );
}
