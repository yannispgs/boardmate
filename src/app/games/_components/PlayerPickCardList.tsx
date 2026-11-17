"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type Modifier,
  MouseSensor,
  TouchSensor,
  type UniqueIdentifier,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRef } from "react";
import type { Player, PlayerId } from "@/lib/domain";
import { moved } from "@/lib/ui/selection";
import { PlayerPickCard } from "./PlayerPickCard";

/**
 * How long a finger rests on a picked player before it lifts the card, and
 * how far it may wander meanwhile. Long and still on purpose: the same list is
 * scrolled and tapped all the time, and neither may ever pick a card up.
 */
const HOLD = { delay: 500, tolerance: 8 } as const;

/** The cards slide along the list, never across it. */
const alongTheList: Modifier = ({ transform }) => ({ ...transform, x: 0 });

/**
 * The players to pick from, drawn in the order they're given — the step floats
 * the picked ones to the top so the running order reads off the head of the
 * list instead of being hunted for among the players left out.
 *
 * The picked ones can be put in another order without unpicking them: held
 * still for half a second, a card lifts, and is dragged to its seat among the other
 * picked ones. The list scrolls on its own when the card nears its top or
 * bottom edge.
 */
export function PlayerPickCardList({
  players,
  selected,
  ordered,
  onToggle,
  onReorder,
}: Readonly<{
  players: Player[];
  /** The picked players' ids, in play order. */
  selected: PlayerId[];
  /** Whether the game hands the turn from one player to the next. */
  ordered: boolean;
  onToggle: (id: PlayerId) => void;
  /** The picked players' ids, in their new order. */
  onReorder: (selected: PlayerId[]) => void;
}>) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: HOLD }),
    useSensor(TouchSensor, { activationConstraint: HOLD }),
  );
  // A card let go where it was picked up still gets the tap its press began
  // with — a phone sends it after the finger lifts, late — and that tap must
  // not unpick the player who was just being moved. So the latch stays shut
  // until the next press begins, rather than for a set while.
  const dragging = useRef(false);
  const nameOf = (id: UniqueIdentifier) =>
    players.find(p => p.id === id)?.name ?? "";

  function dropped({ active, over }: DragEndEvent) {
    if (over !== null && active.id !== over.id) {
      onReorder(moved(selected, active.id as PlayerId, over.id as PlayerId));
    }
  }

  return (
    <DndContext
      sensors={sensors}
      // The seat whose middle is nearest: a card dropped between two rows
      // lands on one of them rather than nowhere.
      collisionDetection={closestCenter}
      modifiers={[alongTheList]}
      onDragStart={() => {
        dragging.current = true;
        navigator.vibrate?.(30);
      }}
      onDragEnd={dropped}
      accessibility={{
        announcements: {
          onDragStart: ({ active }) => `${nameOf(active.id)} soulevé.`,
          onDragOver: ({ active, over }) =>
            over === null
              ? `${nameOf(active.id)} hors des places.`
              : `${nameOf(active.id)} à la place de ${nameOf(over.id)}.`,
          onDragEnd: ({ active, over }) =>
            over === null
              ? `${nameOf(active.id)} reposé à sa place.`
              : `${nameOf(active.id)} posé à la place de ${nameOf(over.id)}.`,
          onDragCancel: ({ active }) =>
            `${nameOf(active.id)} reposé à sa place.`,
        },
      }}
    >
      <SortableContext items={selected} strategy={verticalListSortingStrategy}>
        <ul
          className="flex flex-col gap-2"
          onPointerDownCapture={() => {
            dragging.current = false;
          }}
        >
          {players.map(p => {
            const seat = selected.indexOf(p.id);
            const card = (
              <PlayerPickCard
                key={p.id}
                player={p}
                order={seat === -1 ? null : seat + 1}
                ordered={ordered}
                onToggle={() => {
                  if (!dragging.current) {
                    onToggle(p.id);
                  }
                }}
              />
            );

            return seat === -1 ? (
              <li key={p.id}>{card}</li>
            ) : (
              <SortableSeat key={p.id} id={p.id}>
                {card}
              </SortableSeat>
            );
          })}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

/** A picked player's row, which a held press lifts and drags. */
function SortableSeat({
  id,
  children,
}: Readonly<{ id: PlayerId; children: React.ReactNode }>) {
  const { listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <li
      ref={setNodeRef}
      // The sensors' listeners only, not dnd-kit's button attributes: the card
      // inside stays the one control keyboards and screen readers reach.
      {...listeners}
      data-dragging={isDragging ? "" : undefined}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      // A long press must not select the name nor open the phone's own menu.
      className={`select-none [-webkit-touch-callout:none] ${
        isDragging ? "relative z-10 scale-105 rounded-xl shadow-lg" : ""
      }`}
    >
      {children}
    </li>
  );
}
