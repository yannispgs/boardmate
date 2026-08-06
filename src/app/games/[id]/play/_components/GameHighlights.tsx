import { formatDuration } from "@/lib/game/format-time";
import type { GameStats } from "@/lib/game/stats";

import { HighlightRow } from "./HighlightRow";

interface Highlight {
  key: string;
  icon: string;
  label: string;
  value: string;
  detail: string;
  alert?: boolean;
}

/**
 * The three records a game may leave behind — the longest turn, the player who
 * paused the most, the one who ran over the clock the most. Each only shows up
 * when it happened: a game nobody paused says nothing about pauses.
 */
export function GameHighlights({ stats }: Readonly<{ stats: GameStats }>) {
  const highlights: Highlight[] = [];

  if (stats.longestTurn) {
    highlights.push({
      key: "longest",
      icon: "⏳",
      label: "Tour le plus long",
      value: formatDuration(stats.longestTurn.durationS),
      detail: `${stats.longestTurn.name}, tour ${stats.longestTurn.round}`,
    });
  }

  if (stats.mostPaused) {
    const plural = stats.mostPaused.count > 1 ? "s" : "";

    highlights.push({
      key: "paused",
      icon: "⏸️",
      label: "Le plus en pause",
      value: formatDuration(stats.mostPaused.durationS),
      detail: `${stats.mostPaused.name} (${stats.mostPaused.count} pause${plural})`,
    });
  }

  if (stats.mostOvertime) {
    highlights.push({
      key: "overtime",
      icon: "⏱️",
      label: "Le plus en dépassement",
      value: formatDuration(stats.mostOvertime.overtimeS),
      detail: stats.mostOvertime.name,
      alert: true,
    });
  }

  return (
    <>
      {highlights.map(highlight => (
        <HighlightRow
          key={highlight.key}
          icon={highlight.icon}
          label={highlight.label}
          value={highlight.value}
          detail={highlight.detail}
          alert={highlight.alert}
        />
      ))}
    </>
  );
}
