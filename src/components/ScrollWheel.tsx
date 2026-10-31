"use client";

import { useEffect, useRef } from "react";

const ITEM = 40; // px per value — tight, so the neighbours sit close
const VISIBLE = 5; // values on show, the chosen one in the middle
const SETTLE_MS = 100; // quiet this long, and the wheel has stopped

/**
 * A wheel of values scrolled with the thumb, coming to rest on each one — the
 * picker an iPhone shows for a timer. The value under the middle band is the
 * one chosen.
 *
 * ⚠️ No CSS scroll snapping: Safari worked its snap points out on its own and
 * left the values half a step off the band, then pulled back any correction.
 * The wheel scrolls freely and, once it stops, slides itself onto the nearest
 * value (see `realign`).
 */
export function ScrollWheel({
  values,
  value,
  label,
  onChange,
}: Readonly<{
  values: readonly number[];
  value: number;
  label: string;
  onChange: (value: number) => void;
}>) {
  const ref = useRef<HTMLDivElement>(null);
  const start = useRef(value);
  const quiet = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touching = useRef(false);

  useEffect(() => {
    const index = values.indexOf(start.current);

    ref.current?.scrollTo({ top: Math.max(0, index) * ITEM });
  }, [values]);

  useEffect(() => {
    return () => {
      if (quiet.current !== null) {
        clearTimeout(quiet.current);
      }
    };
  }, []);

  function settle() {
    const top = ref.current?.scrollTop ?? 0;
    const picked = values[Math.round(top / ITEM)];

    if (picked !== undefined && picked !== value) {
      onChange(picked);
    }

    if (quiet.current !== null) {
      clearTimeout(quiet.current);
    }

    quiet.current = setTimeout(realign, SETTLE_MS);
  }

  /**
   * Puts the value that stopped nearest the band right in it, once the wheel
   * has been still a moment — never while a thumb is still on it, which would
   * fight the thumb.
   */
  function realign() {
    const wheel = ref.current;

    if (wheel === null || touching.current) {
      return;
    }

    const target = Math.round(wheel.scrollTop / ITEM) * ITEM;

    if (Math.abs(wheel.scrollTop - target) > 0.5) {
      wheel.scrollTo({ top: target, behavior: "smooth" });
    }
  }

  return (
    <div className="relative" style={{ height: ITEM * VISIBLE }}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 rounded-xl bg-black/5 dark:bg-white/10"
        style={{ top: ITEM * 2, height: ITEM }}
      />
      <div
        ref={ref}
        role="listbox"
        aria-label={label}
        onScroll={settle}
        onTouchStart={() => {
          touching.current = true;
        }}
        onTouchEnd={() => {
          touching.current = false;
          settle();
        }}
        className="relative h-full overflow-y-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          paddingBlock: ITEM * 2,
          maskImage:
            "linear-gradient(to bottom, transparent, black 35%, black 65%, transparent)",
        }}
      >
        {values.map((v, index) => {
          const offset = index - values.indexOf(value);

          return (
            <div
              key={v}
              role="option"
              aria-selected={v === value}
              className={`flex items-center justify-center tabular-nums transition-all ${sizeAt(
                Math.abs(offset),
              )}`}
              style={{
                height: ITEM,
                transform: `translateY(${-Math.sign(offset) * pullAt(Math.abs(offset))}px)`,
              }}
            >
              {v}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * How large a value reads at a distance from the chosen one: a step smaller
 * per row away, so the chosen one stands out without the others vanishing.
 */
function sizeAt(distance: number): string {
  if (distance === 0) {
    return "text-3xl font-semibold";
  }

  if (distance === 1) {
    return "text-2xl text-zinc-400 dark:text-zinc-500";
  }

  return "text-xl text-zinc-400 dark:text-zinc-500";
}

/**
 * How far a value is drawn in towards the chosen one, in pixels. Every value
 * sits in a slot of the same height, so a smaller figure leaves more air around
 * it: pulled in, the gaps read even from the middle out.
 */
function pullAt(distance: number): number {
  // Capped well under a step: past the second neighbour nothing is on show,
  // and a pull bigger than the gap would put a value where its neighbour is.
  if (distance < 2) {
    return 0;
  }

  return distance === 2 ? 4 : 8;
}
