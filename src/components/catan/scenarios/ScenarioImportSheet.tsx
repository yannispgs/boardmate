"use client";

import { useState } from "react";

import { ErrorText } from "@/components/ErrorText";
import { Modal } from "@/components/Modal";
import { ModalHeader } from "@/components/ModalHeader";
import { modalCardClass } from "@/components/ui";
import type { ScenarioSpec } from "@/lib/catan/scenario-spec";
import {
  type ImportRefusal,
  parseScenarioText,
} from "@/lib/catan/scenario-transfer";

/** What to say about a paste that could not be read as a scenario. */
const refusalMessage: Record<ImportRefusal, string> = {
  empty: "Colle d'abord le texte d'un scénario copié.",
  "not-json":
    "Ce texte n'est pas un scénario exporté. Copie-le en entier, sans rien couper.",
  "not-a-scenario":
    "Ce texte ne décrit pas un scénario : il vient peut-être d'ailleurs, ou d'une version plus récente de l'appli.",
};

/**
 * Bringing a scenario in from somewhere else — the other environment, a copy
 * kept aside, or the same one twice to start a variant of it. The map arrives as
 * the text the copy button produced, and is refused whole rather than half-read.
 *
 * An outside click doesn't close it: the pasted text is work that a stray tap on
 * the backdrop would throw away.
 */
export function ScenarioImportSheet({
  onImport,
  onClose,
}: Readonly<{
  onImport: (spec: ScenarioSpec) => void;
  onClose: () => void;
}>) {
  const [text, setText] = useState("");
  const [refusal, setRefusal] = useState<ImportRefusal | null>(null);

  function submit() {
    const read = parseScenarioText(text);

    if (!read.ok) {
      setRefusal(read.refusal);

      return;
    }

    onImport(read.spec);
    onClose();
  }

  return (
    <Modal
      onClose={onClose}
      dismissable={false}
      label="Importer un scénario"
      className={`${modalCardClass} max-w-md`}
    >
      <ModalHeader
        title="Importer un scénario"
        hint="Colle le texte copié depuis un autre scénario"
        onClose={onClose}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain p-4">
        <textarea
          value={text}
          onChange={e => {
            setText(e.target.value);
            setRefusal(null);
          }}
          rows={8}
          placeholder="{ … }"
          className="w-full rounded-lg border border-black/10 p-3 font-mono text-xs dark:border-white/15 dark:bg-zinc-950"
        />

        <ErrorText message={refusal && refusalMessage[refusal]} />

        <button
          type="button"
          onClick={submit}
          className="self-start rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500"
        >
          Importer
        </button>
      </div>
    </Modal>
  );
}
