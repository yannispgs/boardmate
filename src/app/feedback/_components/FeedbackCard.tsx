"use client";

import type { Feedback, FeedbackStatus } from "@/lib/domain";

const dateFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/**
 * How each stage reads and looks. Neutral while nothing has been decided, warm
 * once the idea is being written, red when it won't be — the colour carries the
 * same news as the word, so a full box can be read by scanning the left edge.
 */
const STAGE: Record<FeedbackStatus, { label: string; className: string }> = {
  new: {
    label: "Nouveau",
    className:
      "border border-black/10 text-zinc-600 dark:border-white/15 dark:text-zinc-300",
  },
  accepted: {
    label: "Accepté",
    className: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  refused: {
    label: "Refusé",
    className: "bg-red-500/10 text-red-700 dark:text-red-300",
  },
  development: {
    label: "Développement",
    className: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  approval: {
    label: "Approbation",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
};

/** Where the retour stands, in one word. */
function StageChip({ status }: Readonly<{ status: FeedbackStatus }>) {
  const stage = STAGE[status];

  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${stage.className}`}
    >
      {stage.label}
    </span>
  );
}

/**
 * One idea in the box, headed by the stage it has reached. A retour leaves the
 * list altogether once it is in production, so what is on screen is what is
 * still owed — the stage says how far along it is, never that it is done.
 */
export function FeedbackCard({ item }: Readonly<{ item: Feedback }>) {
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-2">
        <StageChip status={item.status} />
        <span className="text-xs text-zinc-400">
          {dateFmt.format(new Date(item.createdAt))}
        </span>
      </div>

      <p className="whitespace-pre-wrap text-sm">{item.message}</p>
    </li>
  );
}
