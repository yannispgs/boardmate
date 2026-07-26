import type { Metadata } from "next";
import Link from "next/link";

import { ScenariosManager } from "./_components/ScenariosManager";

export const metadata: Metadata = {
  title: "Scénarios Catan - Marins — Boardmate",
};

export default function MarinsScenariosPage() {
  return (
    // The page scrolls as one document: the title and the way back up to the
    // generator scroll away with the rest instead of holding a band of a large
    // editor screen for good.
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-6">
      <header className="flex flex-col gap-1 pt-10 pb-6">
        <Link
          href="/tools/board-generator/catan-marins"
          className="text-sm text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          ← Plateau Catan - Marins
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Scénarios</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Saisis le plan d&apos;un scénario Marins — ses zones, ses tuiles, ses
          jetons et ses ports — pour que le générateur puisse le tirer.
        </p>
      </header>

      <ScenariosManager />
    </main>
  );
}
