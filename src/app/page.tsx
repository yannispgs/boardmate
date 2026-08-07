import Link from "next/link";
import { signOut } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/session";
import pkg from "../../package.json";

const TOOLS: {
  name: string;
  emoji: string;
  href?: string;
}[] = [
  { name: "Joueurs", emoji: "👥", href: "/players" },
  { name: "Jeux", emoji: "🎲", href: "/boardgames" },
  { name: "Parties", emoji: "🃏", href: "/games" },
  { name: "Roue de la chance", emoji: "🎡", href: "/tools/wheel" },
  { name: "Statistiques", emoji: "📊", href: "/stats" },
  {
    name: "Générer un plateau",
    emoji: "🗺️",
    href: "/tools/board-generator",
  },
  { name: "FAQ", emoji: "❓", href: "/faq" },
  { name: "Retours", emoji: "📝", href: "/feedback" },
];

// Short commit hash of the deployed build, when running on Vercel.
const build = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7);

const cardClass =
  "flex flex-col items-center gap-1 rounded-xl border border-black/10 bg-white p-4 text-center dark:border-white/10 dark:bg-zinc-900";

export default async function Home() {
  const user = await getCurrentUser();

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
        {user ? (
          <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
            <span>{user.email}</span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-md border border-black/10 px-2 py-1 font-medium transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
              >
                Se déconnecter
              </button>
            </form>
          </div>
        ) : null}
      </header>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {TOOLS.map(tool => {
          const content = (
            <>
              <span aria-hidden className="text-2xl">
                {tool.emoji}
              </span>
              <span className="text-sm font-medium">{tool.name}</span>
            </>
          );
          return (
            <li key={tool.name}>
              {tool.href ? (
                <Link
                  href={tool.href}
                  className={`${cardClass} transition hover:border-indigo-400`}
                >
                  {content}
                </Link>
              ) : (
                <div className={cardClass}>{content}</div>
              )}
            </li>
          );
        })}
      </ul>

      <p className="text-center text-xs text-zinc-400">
        v{pkg.version}
        {build ? ` · ${build}` : ""}
      </p>
    </main>
  );
}
