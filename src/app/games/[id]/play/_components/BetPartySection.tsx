import { BetPlayerCardList } from "@/components/stats/BetPlayerCardList";
import type { StageBet } from "@/lib/domain";
import { type BetParty, betStats } from "@/lib/game/bet-stats";

/** The players of a party played on bets, the most reliable first. */
export function BetPartySection({
  bet,
  party,
}: Readonly<{
  bet: StageBet;
  /** The party, and how many donnes it lasts. */
  party: BetParty & { count: number };
}>) {
  const players = betStats([party], bet, party.count).players;

  if (players.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
        Paris — du plus fiable au moins fiable
      </h3>
      <BetPlayerCardList stats={players} hedgeLabel={bet.hedgeLabel} />
    </div>
  );
}
