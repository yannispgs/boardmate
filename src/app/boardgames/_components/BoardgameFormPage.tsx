"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { BoardgameId, NewBoardgame } from "@/lib/domain";
import { useBoardgames } from "@/lib/hooks/use-boardgames";
import { BoardgameForm } from "./BoardgameForm";

/**
 * Wraps {@link BoardgameForm} in the page's data flow: create (`boardgameId`
 * absent) or edit (looked up in the synced list). Creating a game sends you back
 * to the list; editing an existing one saves in place (this is the game's
 * settings hub) and flashes "Enregistré", so you can keep tweaking its
 * configurations below.
 */
export function BoardgameFormPage({
  boardgameId,
}: Readonly<{
  boardgameId?: BoardgameId;
}>) {
  const router = useRouter();
  const { boardgames, loading, addBoardgame, editBoardgame, uploadLogo } =
    useBoardgames();
  const [saved, setSaved] = useState(false);

  const back = () => router.push("/boardgames");

  async function submit(input: NewBoardgame, editingId: BoardgameId | null) {
    if (editingId) {
      await editBoardgame(editingId, input);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
    } else {
      await addBoardgame(input);
      back();
    }
  }

  if (!boardgameId) {
    return (
      <BoardgameForm
        initial={null}
        onSubmit={submit}
        onCancel={back}
        uploadLogo={uploadLogo}
      />
    );
  }

  const boardgame = boardgames.find(b => b.id === boardgameId);

  if (loading && !boardgame) {
    return <p className="text-sm text-zinc-500">Chargement…</p>;
  }

  if (!boardgame) {
    return (
      <p className="text-sm text-zinc-500">
        Ce jeu est introuvable. Il a peut-être été supprimé.
      </p>
    );
  }

  return (
    <BoardgameForm
      initial={boardgame}
      onSubmit={submit}
      onCancel={back}
      uploadLogo={uploadLogo}
      saved={saved}
    />
  );
}
