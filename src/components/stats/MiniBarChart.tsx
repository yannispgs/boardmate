const TRACK = 96; // px for the tallest bar
const STUB = 4; // min height so a zero still shows

export interface MiniBar {
  key: string;
  /** Under the bar — the manche, the phase. */
  label: string;
  value: number;
  /** Above the bar — the value as it should read (« 2.5 », « 7 »). */
  caption: string;
}

/**
 * A row of small bars against a common scale, labelled under and captioned
 * above — the shape every « per manche » or « per phase » figure takes.
 */
export function MiniBarChart({
  bars,
  max,
  testId,
}: Readonly<{
  bars: readonly MiniBar[];
  /** The value a full bar stands for; the tallest bar when omitted. */
  max?: number;
  testId?: string;
}>) {
  const scale = max ?? Math.max(1, ...bars.map(bar => bar.value));

  return (
    <div data-testid={testId} className="flex flex-col gap-1">
      <div className="flex items-end justify-between gap-1">
        {bars.map(bar => (
          <div
            key={bar.key}
            className="flex flex-1 flex-col items-center justify-end gap-1"
          >
            <span className="text-[10px] text-zinc-500 tabular-nums leading-none dark:text-zinc-400">
              {bar.caption}
            </span>
            <span
              className="w-full rounded-t bg-indigo-500"
              style={{ height: STUB + (bar.value / scale) * (TRACK - STUB) }}
            />
          </div>
        ))}
      </div>

      <div className="flex justify-between gap-1">
        {bars.map(bar => (
          <span
            key={bar.key}
            className="flex-1 text-center text-[10px] font-medium text-zinc-500 tabular-nums dark:text-zinc-400"
          >
            {bar.label}
          </span>
        ))}
      </div>
    </div>
  );
}
