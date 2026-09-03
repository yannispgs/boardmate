"use client";

import { Toggle } from "@/components/Toggle";
import type { PlayerRecap, RecapScope } from "@/lib/game/player-recap";

import { PlayerRecapCardList } from "./PlayerRecapCardList";

/** The two readings, both written on the switch so neither is left implicit. */
const ALL_LABEL = "Toutes les parties";
const SAME_TABLE_LABEL = "À nombre de joueurs égal";

/**
 * The « joueurs » half of the end-of-game screen: each player of the party
 * against **his own** past parties on this game.
 *
 * It sits beside the party's own figures rather than inside them because the
 * two answer different questions — « combien de temps a duré la partie » is a
 * fact of the party, « 82 points, est-ce beaucoup pour moi » is a fact of a
 * career. And it is a sibling of the statistics panel, not a part of it: a game
 * that records neither turn nor manche (Papayoo) has no panel at all, and its
 * players still have a history worth reading.
 *
 * Every figure is a bar rather than a card you press: the spread it used to
 * take a modal to see is now on the line itself, one bar per figure per player.
 * Six framed cards at the end of a six-handed game were a scrolling exercise,
 * and « où je me situe » is not a question worth a tap.
 *
 * The whole section carries **one** switch, at the top. Per-player switches
 * would let two players be read on two different sets of parties side by side,
 * which is exactly the comparison this section is built not to invite.
 *
 * That switch is a **toggle carrying both names**, not a pair of pills: the
 * pills would be a second row of them right under the tab bar that opens this
 * section, two identical-looking rows saying two different kinds of thing. The
 * name in bold is the one the figures below are counted on, so what is being
 * read is legible without touching anything — and the switch left off is the
 * honest default, all of a player's parties.
 *
 * Its name lives on the tab that opens it ({@link EndRecapTabs}), not here.
 */
export function PlayerRecapSection({
  recaps,
  byTable,
  scope,
  onScope,
  rightGutter,
}: Readonly<{
  recaps: readonly PlayerRecap[];
  /** Whether the « à nombre de joueurs égal » switch is worth offering. */
  byTable: boolean;
  scope: RecapScope;
  onScope: (scope: RecapScope) => void;
  /**
   * Whether something is pinned to the screen's right edge. Only the rows make
   * room for it: they are the one thing here that runs to the edge, and the
   * sentence and the switch above are centred text that would visibly drift off
   * the page's own centre if they were inset too.
   */
  rightGutter: boolean;
}>) {
  return (
    <section className="flex flex-col gap-4">
      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        Chacun face à ses propres parties sur ce jeu : le curseur est celle-ci,
        les points gris ses parties d&apos;avant.
      </p>

      {byTable ? (
        <Toggle
          off={ALL_LABEL}
          on={SAME_TABLE_LABEL}
          checked={scope === "sameTable"}
          onChange={on => onScope(on ? "sameTable" : "all")}
          className="self-center"
        />
      ) : null}

      <PlayerRecapCardList recaps={recaps} rightGutter={rightGutter} />
    </section>
  );
}
