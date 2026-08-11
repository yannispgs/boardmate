"use client";

import { useState } from "react";

import { Drawer } from "@/components/Drawer";
import { ErrorText } from "@/components/ErrorText";
import { FlagIcon } from "@/components/icons";
import { ModalHeader } from "@/components/ModalHeader";
import type { MilestoneSpec, PlayerId } from "@/lib/domain";
import { milestoneRows, milestonesLeft } from "@/lib/game/milestones";
import { MilestoneCardList } from "./MilestoneCardList";
import type { MilestoneLog } from "./use-milestones";

/**
 * The milestones of the game on the table (Terraforming Mars), handed out as
 * they are taken. It opens from the **left** edge, where what belongs to this
 * game alone lives — the right edge is the app's own (score, live stats, FAQ)
 * and is the same whatever is being played.
 *
 * The badge counts what is left rather than what is taken: three is all a game
 * ever gives out, and the question at the table is always how many remain.
 *
 * Its button hangs at the same height as the live-stats one opposite, not at
 * the top: the top-left corner already belongs to « ← Parties », and a button
 * there would sit on the way back out.
 */
export function MilestonePanel({
  spec,
  gameName,
  seats,
  log,
}: Readonly<{
  spec: MilestoneSpec;
  /** Named under the title, the same way every other panel says where it is. */
  gameName: string;
  seats: ReadonlyArray<{ id: PlayerId; name: string }>;
  log: MilestoneLog;
}>) {
  const [open, setOpen] = useState(false);

  const rows = milestoneRows(spec, log.claims);
  const left = milestonesLeft(spec, log.claims);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Ouvrir les ${spec.label.toLowerCase()}s`}
        className="fixed left-3 top-[38%] z-30 flex items-center justify-center rounded-full bg-indigo-600 p-3 text-white shadow-lg transition hover:bg-indigo-500"
      >
        <FlagIcon className="h-6 w-6" />
      </button>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        label={`${spec.label}s`}
        side="left"
      >
        <ModalHeader
          title={`${spec.label}s`}
          hint={gameName}
          badge={`${left} / ${spec.max}`}
          onClose={() => setOpen(false)}
        />

        <div className="flex flex-col gap-4 p-4">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {remaining(left, spec)}
          </p>

          <ErrorText message={log.error} />

          <MilestoneCardList
            rows={rows}
            seats={seats}
            points={spec.points}
            disabled={log.busy}
            onClaim={log.claim}
            onRelease={log.release}
          />
        </div>
      </Drawer>
    </>
  );
}

/** What the badge means, spelled out: how many are still to be taken. */
function remaining(left: number, spec: MilestoneSpec): string {
  const name = spec.label.toLowerCase();

  if (left === 0) {
    return `Les ${spec.max} ${name}s ont été pris.`;
  }

  return left === 1
    ? `Encore un ${name} à prendre, à ${spec.points} points.`
    : `Encore ${left} ${name}s à prendre, à ${spec.points} points chacun.`;
}
