import type { Metadata } from "next";

import { FeedbackManager } from "./_components/FeedbackManager";

export const metadata: Metadata = {
  title: "Retours — Boardmate",
};

export default function FeedbackPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">Retours</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Une idée d&apos;amélioration ? Note-la ici, on les parcourra de temps
          en temps.
        </p>
      </header>

      <FeedbackManager />
    </main>
  );
}
