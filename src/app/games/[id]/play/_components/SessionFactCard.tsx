import type { SessionFact } from "@/lib/game/session-facts";

/** One remarkable fact of the evening, said in one line. */
export function SessionFactCard({ fact }: Readonly<{ fact: SessionFact }>) {
  return (
    <li className="rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/10">
      {fact.text}
    </li>
  );
}
