"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { extensionsBackLink } from "@/lib/game/scenario-editor";

const linkClass =
  "text-sm text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200";

/** The way out when nobody claimed to have sent us here. */
export function GamesBackLink() {
  return (
    <Link href="/boardgames" className={linkClass}>
      ← Jeux
    </Link>
  );
}

/**
 * The way out of a game's page: back to the games list, or to whoever sent us
 * here and said so in the URL (the Marins board generator, which reads
 * scenarios but sends anyone wanting to change one over to the game they belong
 * to). A layout is never given the query string, so the origin is read on the
 * client.
 */
export function BoardgameBackLink() {
  const from = useSearchParams().get("from") ?? undefined;
  const back = extensionsBackLink(from);

  return (
    <Link href={back.href} className={linkClass}>
      {back.label}
    </Link>
  );
}
