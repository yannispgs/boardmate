/**
 * Formats a duration in seconds as a clock string: `m:ss`, or `h:mm:ss` once it
 * reaches an hour. Seconds are rounded and clamped at zero so a computed mean
 * (which may be fractional or slightly negative from rounding) still renders.
 */
export function formatDuration(totalS: number): string {
  const s = Math.max(0, Math.round(totalS));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
