import { type BetParty, betHighlights } from "@/lib/game/bet-stats";

import { TallyHighlight } from "./TallyHighlight";

/**
 * What stands out of a party played on bets (Luz): its biggest drop, and
 * whoever won every bet — the perfect party.
 */
export function BetHighlights({
  party,
  unit,
}: Readonly<{
  /** The party, and how many donnes it lasts. */
  party: BetParty & { count: number };
  /** What a manche is called, lower case (« donne »). */
  unit: string;
}>) {
  const { drop, perfect } = betHighlights(party, party.count);

  return (
    <>
      {drop === null ? null : (
        <TallyHighlight emoji="📉">
          <span className="font-semibold">{drop.name}</span> a perdu{" "}
          {-drop.points} points à la {unit} {drop.stage} — la plus grosse chute
          de la partie.
        </TallyHighlight>
      )}

      {perfect.map(name => (
        <TallyHighlight key={name} emoji="🎯">
          <span className="font-semibold">{name}</span> a réussi ses{" "}
          {party.count} paris : la partie parfaite !
        </TallyHighlight>
      ))}
    </>
  );
}
