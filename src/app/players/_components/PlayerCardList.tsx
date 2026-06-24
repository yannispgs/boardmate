"use client";

import { ChevronRightIcon } from "@/components/icons";
import type { Player } from "@/lib/domain";
import { PlayerCard } from "./PlayerCard";

const headingClass =
  "text-xs font-semibold uppercase tracking-wide text-zinc-400";

/**
 * A titled list of players. Renders a `PlayerCard` per item; the deactivated
 * section passes `collapsible` to hide its cards behind a disclosure (collapsed
 * by default).
 */
export function PlayerCardList({
  title,
  players,
  onToggle,
  actionLabel,
  onDelete,
  dimmed = false,
  collapsible = false,
}: {
  title: string;
  players: Player[];
  onToggle: (player: Player) => void;
  actionLabel: string;
  onDelete: (player: Player) => void;
  dimmed?: boolean;
  collapsible?: boolean;
}) {
  if (players.length === 0) return null;

  const cards = (
    <ul className="flex flex-col gap-2">
      {players.map((player) => (
        <PlayerCard
          key={player.id}
          player={player}
          onToggle={onToggle}
          onDelete={onDelete}
          actionLabel={actionLabel}
          dimmed={dimmed}
        />
      ))}
    </ul>
  );

  if (collapsible) {
    return (
      <details className="group flex flex-col gap-2">
        <summary
          className={`flex cursor-pointer list-none items-center gap-1.5 ${headingClass}`}
        >
          <ChevronRightIcon className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
          {title} · {players.length}
        </summary>
        <div className="mt-2">{cards}</div>
      </details>
    );
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className={headingClass}>
        {title} · {players.length}
      </h2>
      {cards}
    </section>
  );
}
