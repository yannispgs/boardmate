"use client";

import type { Feedback } from "@/lib/domain";
import { FeedbackCard } from "./FeedbackCard";

/** The ideas in the box, newest first. */
export function FeedbackCardList({ items }: Readonly<{ items: Feedback[] }>) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map(item => (
        <FeedbackCard key={item.id} item={item} />
      ))}
    </ul>
  );
}
