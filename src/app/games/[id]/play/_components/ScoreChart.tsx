"use client";

import {
  type PointerEvent as ReactPointerEvent,
  useRef,
  useState,
} from "react";

import type { PlayerId } from "@/lib/domain";
import type { PlayerSeries } from "@/lib/game/score-series";

/** One stable colour per seat, cycled if there are more players than colours. */
const COLORS = [
  "#6366f1",
  "#f59e0b",
  "#10b981",
  "#f43f5e",
  "#0ea5e9",
  "#8b5cf6",
];
/** The objective line's colour (yellow). */
const TARGET = "#eab308";
const W = 320;
const H = 180;
const TOP = 10;
const BOTTOM = 22; // room for the x-axis (tour) labels
const LEFT = 24; // room for the y-axis point labels
const RIGHT = 18; // room for the trophy at the end of the objective line
const PLOT_W = W - LEFT - RIGHT;
const PLOT_H = H - TOP - BOTTOM;

/** The data window currently in view (x = tour fraction 0–1, y = points). */
interface View {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/** Nearest "nice" step (1 / 2 / 5 × 10ⁿ) at or above `rough`, for axis ticks. */
function niceStep(rough: number): number {
  if (rough <= 0) {
    return 1;
  }

  const pow = 10 ** Math.floor(Math.log10(rough));
  const n = rough / pow;
  const base = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;

  return base * pow;
}

/**
 * The score evolution as one step line per player, keyed on the tour it changed.
 * Pinch to zoom and drag to pan (touch); a "Réinitialiser" button (shown once
 * zoomed) returns to the full view. The point (left) and tour (bottom) axes stay
 * pinned and relabel themselves to the visible window, so you always know the
 * coordinates of what's on screen. Plain SVG, no chart dependency.
 */
export function ScoreChart({
  series,
  maxScore,
  threshold,
  rounds,
  players,
}: {
  series: PlayerSeries[];
  maxScore: number;
  threshold: number | null;
  /** Total tours (rounds) the game lasted — the full x-axis span. */
  rounds: number;
  players: { id: PlayerId; name: string }[];
}) {
  const colorOf = (playerId: PlayerId) => {
    const idx = players.findIndex(p => p.id === playerId);

    return COLORS[(idx < 0 ? 0 : idx) % COLORS.length];
  };

  // Round the top up to an even number so the base view frames the data nicely.
  const chartMax = Math.max(
    2,
    Math.ceil(Math.max(maxScore, threshold ?? 0) / 2) * 2,
  );
  const full: View = { x0: 0, x1: 1, y0: 0, y1: chartMax };

  const [view, setView] = useState<View>(full);
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchDist = useRef<number | null>(null);
  const zoomed =
    view.x0 > 0 || view.x1 < 1 || view.y0 > 0 || view.y1 < chartMax;

  const sx = (x: number) =>
    LEFT + ((x - view.x0) / (view.x1 - view.x0)) * PLOT_W;
  const sy = (y: number) =>
    H - BOTTOM - ((y - view.y0) / (view.y1 - view.y0)) * PLOT_H;

  // Keep the window inside the data bounds, honouring min/max zoom.
  function clampView(v: View): View {
    const w = Math.min(1, Math.max(0.08, v.x1 - v.x0));
    const h = Math.min(chartMax, Math.max(1, v.y1 - v.y0));
    const x0 = Math.min(Math.max(0, v.x0), 1 - w);
    const y0 = Math.min(Math.max(0, v.y0), chartMax - h);

    return { x0, x1: x0 + w, y0, y1: y0 + h };
  }

  function toViewBox(clientX: number, clientY: number, rect: DOMRect) {
    return {
      x: (clientX - rect.left) * (W / rect.width),
      y: (clientY - rect.top) * (H / rect.height),
    };
  }

  function onPointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchDist.current = Math.hypot(a.x - b.x, a.y - b.y);
    }
  }

  function onPointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) {
      return;
    }

    const cur = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, cur);
    const pts = [...pointers.current.values()];
    const rect = e.currentTarget.getBoundingClientRect();

    if (pts.length === 1) {
      // Drag to pan: move the window opposite the finger so content follows it.
      const dpx = (cur.x - prev.x) * (W / rect.width);
      const dpy = (cur.y - prev.y) * (H / rect.height);

      setView(v => {
        const dxData = (dpx / PLOT_W) * (v.x1 - v.x0);
        const dyData = (dpy / PLOT_H) * (v.y1 - v.y0);

        return clampView({
          x0: v.x0 - dxData,
          x1: v.x1 - dxData,
          y0: v.y0 + dyData,
          y1: v.y1 + dyData,
        });
      });

      return;
    }

    if (pts.length >= 2 && pinchDist.current !== null) {
      // Pinch to zoom around the fingers' midpoint.
      const [a, b] = pts;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const factor = pinchDist.current / dist;
      pinchDist.current = dist;
      const mid = toViewBox((a.x + b.x) / 2, (a.y + b.y) / 2, rect);

      setView(v => {
        const dataX = v.x0 + ((mid.x - LEFT) / PLOT_W) * (v.x1 - v.x0);
        const dataY = v.y0 + ((H - BOTTOM - mid.y) / PLOT_H) * (v.y1 - v.y0);

        return clampView({
          x0: dataX - (dataX - v.x0) * factor,
          x1: dataX + (v.x1 - dataX) * factor,
          y0: dataY - (dataY - v.y0) * factor,
          y1: dataY + (v.y1 - dataY) * factor,
        });
      });
    }
  }

  function onPointerUp(e: ReactPointerEvent<SVGSVGElement>) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) {
      pinchDist.current = null;
    }
    // The view only ever changes via pan/pinch; nothing resets it on release.
    // Use the "Réinitialiser" button to go back to the full view.
  }

  // Point (y) ticks within the visible range, at a nice step.
  const yStep = niceStep((view.y1 - view.y0) / 5);
  const yTicks: number[] = [];
  for (let t = Math.ceil(view.y0 / yStep) * yStep; t <= view.y1; t += yStep) {
    yTicks.push(Math.round(t));
  }

  // Tour (x) ticks within the visible range, at a nice step of tours.
  const tour0 = view.x0 * rounds;
  const tour1 = view.x1 * rounds;
  const xStep = Math.max(1, niceStep((tour1 - tour0) / 6));
  const xTicks: { x: number; tour: number }[] = [];
  if (rounds > 0) {
    for (let t = Math.ceil(tour0 / xStep) * xStep; t <= tour1; t += xStep) {
      xTicks.push({ x: sx(t / rounds), tour: t });
    }
  }

  const showTarget =
    threshold !== null && threshold >= view.y0 && threshold <= view.y1;

  return (
    <div className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none select-none rounded-xl border border-black/10 dark:border-white/10"
        role="img"
        aria-label="Évolution du score au fil de la partie"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <title>Pince pour zoomer, glisse pour te déplacer</title>

        {/* Clip the plotted content to the plot area (axes stay outside). */}
        <clipPath id="score-plot">
          <rect x={LEFT} y={TOP} width={PLOT_W} height={PLOT_H} />
        </clipPath>

        {/* Horizontal point guides + left-axis labels (relabel with the view). */}
        {yTicks.map(t => (
          <g key={`y-${t}`}>
            <line
              x1={LEFT}
              y1={sy(t)}
              x2={W - RIGHT}
              y2={sy(t)}
              className="stroke-black/10 dark:stroke-white/15"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <text
              x={LEFT - 5}
              y={sy(t)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={9}
              className="fill-zinc-400"
            >
              {t}
            </text>
          </g>
        ))}

        {/* Vertical tour bars + bottom-axis labels. */}
        {xTicks.map(t => (
          <g key={`x-${t.tour}`}>
            <line
              x1={t.x}
              y1={TOP}
              x2={t.x}
              y2={H - BOTTOM}
              className="stroke-black/10 dark:stroke-white/15"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <text
              x={t.x}
              y={H - 7}
              textAnchor="middle"
              fontSize={9}
              className="fill-zinc-400"
            >
              {t.tour}
            </text>
          </g>
        ))}

        <g clipPath="url(#score-plot)">
          {/* Objective line (yellow) with a trophy, when in view. */}
          {showTarget && threshold !== null ? (
            <>
              <line
                x1={LEFT}
                y1={sy(threshold)}
                x2={W - RIGHT}
                y2={sy(threshold)}
                stroke={TARGET}
                strokeWidth={2}
              />
              <text x={W - RIGHT - 10} y={sy(threshold) - 3} fontSize={13}>
                🏆
              </text>
            </>
          ) : null}

          {series.map(s => (
            <polyline
              key={s.playerId}
              fill="none"
              stroke={colorOf(s.playerId)}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              points={s.points
                .map(pt => `${sx(pt.x)},${sy(pt.score)}`)
                .join(" ")}
            />
          ))}
        </g>
      </svg>

      <div className="flex items-center justify-between gap-2">
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
          {players.map(p => (
            <li key={p.id} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: colorOf(p.id) }}
              />
              {p.name}
            </li>
          ))}
        </ul>

        {zoomed ? (
          <button
            type="button"
            onClick={() => setView(full)}
            className="shrink-0 rounded-lg border border-black/10 px-2.5 py-1 text-xs text-zinc-500 transition hover:bg-black/5 dark:border-white/15 dark:text-zinc-400 dark:hover:bg-white/5"
          >
            Réinitialiser
          </button>
        ) : null}
      </div>
    </div>
  );
}
