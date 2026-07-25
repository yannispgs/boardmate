"use client";

import { useEffect, useState } from "react";

import { SEA_STYLE, TERRAIN_STYLE } from "@/components/catan/CatanBoardSvg";
import { axialToPixel, DIRECTIONS } from "@/lib/catan/board";
import { hexCorners, polygonPoints } from "@/lib/catan/hex-geometry";
import { canvasGrid, cellOwner } from "@/lib/catan/scenario-draft";
import {
  cellKey,
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
 * The paintable map of one board: seven rows of `length` spaces, coloured by
 * whatever holds them. Clicking — or dragging across — a space applies the
 * current tool. In `port` mode a click selects a space instead, and the six
 * edges around it become the harbour slots to pin or unpin.
 */
export function ScenarioCanvas({
  board,
  length,
  activeZone,
  tool,
  selected,
  onCell,
  onPort,
}: {
  board: ScenarioBoardSpec;
  length: number;
  activeZone: number;
  tool: CanvasTool;
  /** The space whose harbour edges are on show, in `port` mode. */
  selected: SpecCell | null;
  onCell: (cell: SpecCell) => void;
  onPort: (port: SpecPort) => void;
}) {
  const [drawing, setDrawing] = useState(false);

  useEffect(() => {
    const stop = () => {
      setDrawing(false);
    };

    window.addEventListener("pointerup", stop);

    return () => {
      window.removeEventListener("pointerup", stop);
    };
  }, []);

  const cells = canvasGrid(length);
  const centres = new Map(
    cells.map(cell => [cellKey(cell), axialToPixel(cell.q, cell.r, SIZE)]),
  );

  const pinned = new Set(
    board.zones.flatMap(zone =>
      (zone.ports?.slots ?? []).map(
        slot => `${cellKey(slot)}:${slot.dq},${slot.dr}`,
      ),
    ),
  );

  // The edges on offer: the six around the selected space, plus every harbour
  // already pinned, so unpinning never needs the right space selected first.
  const edges: SpecPort[] = board.zones.flatMap(
    zone => zone.ports?.slots ?? [],
  );

  if (selected !== null && tool === "port") {
    for (const [dq, dr] of DIRECTIONS) {
      const port = { q: selected.q, r: selected.r, dq, dr };

      if (!pinned.has(`${cellKey(port)}:${dq},${dr}`)) {
        edges.push(port);
      }
    }
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

        return (
          <g key={cellKey(cell)}>
            <polygon
              points={polygonPoints(hexCorners(centre.x, centre.y, SIZE))}
              fill={fill}
              fillOpacity={opacity}
              stroke={isSelected ? "#111827" : "#64748b"}
              strokeWidth={isSelected ? 3 : 1}
              className="cursor-pointer"
              onPointerDown={() => {
                setDrawing(true);
                onCell(cell);
              }}
              onPointerEnter={() => {
                // Dragging paints a whole stretch at once; picking the space a
                // harbour hangs off is a one-shot choice, so it stays a click.
                if (drawing && tool !== "port") {
                  onCell(cell);
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
