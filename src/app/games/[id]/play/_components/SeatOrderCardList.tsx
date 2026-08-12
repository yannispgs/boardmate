"use client";

import type { MoveDirection } from "@/lib/game/reorder";
import { SeatOrderCard } from "./SeatOrderCard";
import type { Seat } from "./use-seat-order";

/** The table in the order it will be saved, top seat first. */
export function SeatOrderCardList({
  seats,
  disabled,
  onMove,
}: Readonly<{
  seats: Seat[];
  disabled: boolean;
  onMove: (index: number, direction: MoveDirection) => void;
}>) {
  return (
    // Named so the reorder journey can tell this list from the others on the
    // play screen — a test hook, not an accessibility claim.
    <ol aria-label="Ordre des joueurs" className="flex flex-col gap-2">
      {seats.map((seat, index) => (
        <SeatOrderCard
          key={seat.id}
          seat={index + 1}
          name={seat.name}
          canUp={index > 0}
          canDown={index < seats.length - 1}
          disabled={disabled}
          onMove={direction => onMove(index, direction)}
        />
      ))}
    </ol>
  );
}
