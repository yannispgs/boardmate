const TOOLS = [
  { name: "Chronomètre", emoji: "⏱️", status: "v1" },
  { name: "Joueurs", emoji: "👥", status: "v1" },
  { name: "Jeux", emoji: "🎲", status: "v1" },
  { name: "Parties", emoji: "🃏", status: "v1" },
  { name: "Lancer de dés", emoji: "🎯", status: "bientôt" },
  { name: "Statistiques", emoji: "📊", status: "bientôt" },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-10 px-6 py-16">
      <header className="flex flex-col items-center gap-3 text-center">
        <span aria-hidden className="text-5xl">
          🎲
        </span>
        <h1 className="text-4xl font-semibold tracking-tight">Boardmate</h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          Outils pour vos soirées jeux de société
        </p>
      </header>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {TOOLS.map((tool) => (
          <li
            key={tool.name}
            className="flex flex-col items-center gap-1 rounded-xl border border-black/10 bg-white p-4 text-center dark:border-white/10 dark:bg-zinc-900"
          >
            <span aria-hidden className="text-2xl">
              {tool.emoji}
            </span>
            <span className="text-sm font-medium">{tool.name}</span>
            <span className="text-[11px] uppercase tracking-wide text-zinc-400">
              {tool.status}
            </span>
          </li>
        ))}
      </ul>

      <p className="text-center text-xs text-zinc-400">
        Fondations en place — la suite arrive.
      </p>
    </main>
  );
}
