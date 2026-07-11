"use client";

import { ChevronRightIcon } from "@/components/icons";
import { sectionHeadingClass } from "@/components/ui";
import type { Boardgame } from "@/lib/domain";
import { BoardgameCard } from "./BoardgameCard";

/**
 * A titled list of boardgames. Renders a `BoardgameCard` per item; the
 * deactivated section passes `collapsible` to hide its cards behind a
 * disclosure (collapsed by default).
 */
export function BoardgameCardList({
  title,
  boardgames,
  onToggle,
  actionLabel,
  onDelete,
  dimmed = false,
  collapsible = false,
}: {
  title: string;
  boardgames: Boardgame[];
  onToggle: (b: Boardgame) => void;
  actionLabel: string;
  onDelete: (b: Boardgame) => void;
  dimmed?: boolean;
  collapsible?: boolean;
}) {
  if (boardgames.length === 0) {
    return null;
  }

  const cards = (
    <ul className="flex flex-col gap-2">
      {boardgames.map(b => (
        <BoardgameCard
          key={b.id}
          boardgame={b}
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
          className={`flex cursor-pointer list-none items-center gap-1.5 ${sectionHeadingClass}`}
        >
          <ChevronRightIcon className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
          {title} · {boardgames.length}
        </summary>
        <div className="mt-2">{cards}</div>
      </details>
    );
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className={sectionHeadingClass}>
        {title} · {boardgames.length}
      </h2>
      {cards}
    </section>
  );
}
