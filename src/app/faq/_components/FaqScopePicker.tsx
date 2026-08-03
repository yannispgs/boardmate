"use client";

import { OptionPicker, type PickerOption } from "@/components/OptionPicker";
import type { Boardgame, Extension, FaqScope } from "@/lib/domain";

/** The value standing for "the base game itself" in the extension row. */
const BASE = "base";

/** The value standing for the app-level FAQ in the subject row. */
const APP = "app";

/**
 * Which part of the FAQ is open: Boardmate itself or one game, and — for a game
 * that has extensions — the base game or one of them. Two rows rather than one
 * long list, because an extension's questions are the game's questions in a
 * specific setup, not a subject of their own.
 */
export function FaqScopePicker({
  boardgames,
  extensions,
  scope,
  onChange,
}: Readonly<{
  boardgames: Boardgame[];
  /** Every active extension, all games together. */
  extensions: Extension[];
  scope: FaqScope;
  onChange: (scope: FaqScope) => void;
}>) {
  const openExtension =
    scope.kind === "extension"
      ? extensions.find(e => e.id === scope.extensionId)
      : undefined;
  // An extension's row belongs under its own game, so an open extension is
  // read as "that game, this extension".
  const openGame =
    openExtension?.baseGameId ??
    (scope.kind === "boardgame" ? scope.boardgameId : null);

  const subjects: PickerOption<string>[] = [
    { value: APP, label: "Boardmate" },
    ...boardgames.map(game => ({ value: game.id as string, label: game.name })),
  ];
  const ofGame = extensions.filter(e => e.baseGameId === openGame);

  function pickSubject(value: string) {
    if (value === APP) {
      onChange({ kind: "app" });

      return;
    }

    onChange({ kind: "boardgame", boardgameId: value as Boardgame["id"] });
  }

  function pickExtension(value: string) {
    if (value === BASE) {
      onChange({
        kind: "boardgame",
        boardgameId: openGame as Boardgame["id"],
      });

      return;
    }

    onChange({ kind: "extension", extensionId: value as Extension["id"] });
  }

  return (
    <div className="flex shrink-0 flex-col gap-3">
      <OptionPicker
        variant="chips"
        label="Sujet"
        options={subjects}
        value={openGame ?? APP}
        onChange={pickSubject}
      />

      {ofGame.length > 0 ? (
        <OptionPicker
          variant="chips"
          label="Extension"
          options={[
            { value: BASE, label: "Jeu de base" },
            ...ofGame.map(e => ({ value: e.id as string, label: e.name })),
          ]}
          value={openExtension?.id ?? BASE}
          onChange={pickExtension}
        />
      ) : null}
    </div>
  );
}
