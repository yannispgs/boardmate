import type { Metadata } from "next";

import { LoginForm } from "./_components/LoginForm";

export const metadata: Metadata = {
  title: "Connexion — Boardmate",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const initialError =
    error === "link"
      ? "Ce lien a expiré ou n'est plus valide. Demande-toi un nouveau lien."
      : undefined;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-6 py-16">
      <header className="flex flex-col items-center gap-2 text-center">
        <span aria-hidden className="text-5xl">
          🎲
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">Boardmate</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Connecte-toi pour accéder à tes soirées jeux.
        </p>
      </header>

      <LoginForm initialError={initialError} />
    </main>
  );
}
