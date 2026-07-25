import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Générer un plateau — Boardmate",
};

/** Games with a board generator. Add an entry as each new one ships. */
const GENERATORS: {
  name: string;
  emoji: string;
  href: string;
  description: string;
}[] = [
  {
    name: "Catan - Base",
    emoji: "🎲",
    href: "/tools/board-generator/catan",
    description:
      "Jeu de base, 3–4 ou 5–6 joueurs — plateau aléatoire équilibré.",
  },
  {
    name: "Catan - Marins",
    emoji: "⛵",
    href: "/tools/board-generator/catan-marins",
    description: "Extension Marins — îles, mers et ports par scénario.",
  },
];

export default function BoardGeneratorPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-1">
        <Link
          href="/"
          className="text-sm text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          ← Accueil
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">
          Générer un plateau
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Un plateau aléatoire et équilibré, par jeu. D&apos;autres jeux
          suivront.
        </p>
      </header>

      <ul className="flex flex-col gap-2">
        {GENERATORS.map(g => (
          <li key={g.href}>
            <Link
              href={g.href}
              className="flex items-center gap-3 rounded-xl border border-black/10 bg-white px-4 py-3 transition hover:border-indigo-400 dark:border-white/10 dark:bg-zinc-900"
            >
              <span aria-hidden className="text-2xl">
                {g.emoji}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="font-medium">{g.name}</span>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  {g.description}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
