import { BoardmateLogo } from "@/components/BoardmateLogo";

import { HomeDashboard } from "./_components/HomeDashboard";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 pt-6 pb-4">
      <header className="flex items-center gap-2.5">
        <BoardmateLogo className="h-8 w-8" />
        <h1 className="text-2xl font-bold tracking-tight">Boardmate</h1>
      </header>

      <HomeDashboard />
    </main>
  );
}
