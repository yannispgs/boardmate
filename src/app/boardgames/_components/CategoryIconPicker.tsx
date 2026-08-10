"use client";

import { useState } from "react";

import { CategoryIcon } from "@/components/CategoryIcon";
import {
  CATEGORY_ICONS,
  type CategoryIconId,
  isCategoryIconId,
} from "@/lib/game/category-icons";

const trigger =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-black/15 text-xs text-zinc-500 transition active:bg-black/5 dark:border-white/15 dark:active:bg-white/10";

const choice =
  "flex h-9 w-9 items-center justify-center rounded-md border transition active:bg-black/5 dark:active:bg-white/10";

/**
 * Picks the pictogram a scored line wears instead of its label, out of the
 * drawings the app ships. Opens in place under the row rather than in a
 * portal — the editor is a form you scroll, and a floating panel would drift
 * away from the line it belongs to.
 *
 * `undefined` is a legitimate choice: the line then reads as its text, which is
 * what every line does until somebody picks otherwise.
 */
export function CategoryIconPicker({
  icon,
  label,
  onIcon,
}: Readonly<{
  icon: string | undefined;
  label: string;
  onIcon: (icon: CategoryIconId | undefined) => void;
}>) {
  const [open, setOpen] = useState(false);

  const current = isCategoryIconId(icon) ? icon : null;

  function pick(next: CategoryIconId | undefined) {
    onIcon(next);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(previous => !previous)}
        aria-label="Choisir un symbole"
        aria-expanded={open}
        className={trigger}
      >
        {current ? (
          <CategoryIcon id={current} title={label} className="h-4 w-4" />
        ) : (
          "Abc"
        )}
      </button>

      {open ? (
        <div className="flex w-full flex-col gap-2 rounded-lg border border-black/10 p-2 dark:border-white/10">
          <span className="text-xs text-zinc-500">
            Le symbole remplace le texte sur la feuille de score. Une légende le
            traduit en toutes lettres.
          </span>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => pick(undefined)}
              className={`${choice} px-2 text-xs ${
                current === null
                  ? "border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                  : "border-black/15 text-zinc-500 dark:border-white/15"
              }`}
            >
              Abc
            </button>

            {CATEGORY_ICONS.map(option => (
              <button
                key={option.id}
                type="button"
                onClick={() => pick(option.id)}
                title={option.name}
                className={`${choice} ${
                  current === option.id
                    ? "border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                    : "border-black/15 dark:border-white/15"
                }`}
              >
                <CategoryIcon
                  id={option.id}
                  title={option.name}
                  className="h-5 w-5"
                />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
