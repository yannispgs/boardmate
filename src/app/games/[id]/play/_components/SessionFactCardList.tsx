import type { SessionFact } from "@/lib/game/session-facts";

import { SessionFactCard } from "./SessionFactCard";

/** What the evening has to say, one line each, in the order it says it. */
export function SessionFactCardList({
  facts,
}: Readonly<{ facts: readonly SessionFact[] }>) {
  return (
    <ul aria-label="Faits de la soirée" className="flex w-full flex-col gap-2">
      {facts.map(fact => (
        <SessionFactCard key={fact.kind} fact={fact} />
      ))}
    </ul>
  );
}
