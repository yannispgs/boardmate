"use client";

import { type ReactNode, useState } from "react";

import type { GeneratorOptions } from "@/lib/catan/generator-options";
import { Check } from "./Check";
import { ToleranceRange } from "./ToleranceRange";

/** Which desert rule the board being generated actually has. */
export type DesertRule = "rings" | "pair" | "none";

const sectionClass =
  "flex w-full max-w-md flex-col gap-2 rounded-xl border border-black/10 p-4 dark:border-white/10";

const numField =
  "w-20 rounded-lg border border-black/15 bg-white px-2 py-1 outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900";

/**
 * Where the desert may land. The rule depends on the board: the base hexagon
 * has rings to keep it off, the 5-6 player board has two deserts to keep apart,
 * and a Marins scenario has neither — its deserts come out of a zone's bag,
 * wherever that zone happens to be.
 */
function DesertRules({
  rule,
  options,
  onChange,
}: Readonly<{
  rule: DesertRule;
  options: GeneratorOptions;
  onChange: (patch: Partial<GeneratorOptions>) => void;
}>) {
  if (rule === "none") {
    return null;
  }

  if (rule === "pair") {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Déserts</span>
        <Check
          label="Autoriser les deux déserts adjacents"
          checked={options.allowAdjacentDeserts}
          onChange={v => onChange({ allowAdjacentDeserts: v })}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">Permettre un désert sur :</span>
      <Check
        label="la couronne intérieure"
        checked={options.desertInner}
        onChange={v => onChange({ desertInner: v })}
      />
      <Check
        label="la couronne extérieure"
        checked={options.desertOuter}
        onChange={v => onChange({ desertOuter: v })}
      />
    </div>
  );
}

/**
 * The generator's tunable rules, behind a button and reset on every visit. Both
 * board generators show the same panel: the rules that decide where a terrain
 * and a number may go are the engine's, not one board's — only the desert
 * block, which is pure geometry, changes with the board.
 */
export function GeneratorSettings({
  options,
  onChange,
  deserts,
  zones,
}: Readonly<{
  options: GeneratorOptions;
  onChange: (patch: Partial<GeneratorOptions>) => void;
  deserts: DesertRule;
  /**
   * The per-zone margins, shown under the board's own once zone balance is on.
   * Only a scenario has zones — the base board leaves this out and never offers
   * the switch.
   */
  zones?: ReactNode;
}>) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-black/15 px-4 py-2 text-sm font-medium transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
      >
        ⚙️ Configurer les paramètres du générateur
      </button>
    );
  }

  return (
    <section className={sectionClass}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Paramètres du générateur</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-zinc-500 transition hover:underline"
        >
          Masquer
        </button>
      </div>

      <fieldset
        disabled={options.ignore}
        className="flex flex-col gap-4 disabled:opacity-50"
      >
        <DesertRules rule={deserts} options={options} onChange={onChange} />

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Contraintes</span>
          <Check
            label="Pas de 6/8 adjacents"
            checked={options.avoidReds}
            onChange={v => onChange({ avoidReds: v })}
          />
          <Check
            label="Pas de nombres identiques adjacents"
            checked={options.avoidDuplicates}
            onChange={v => onChange({ avoidDuplicates: v })}
          />
          <Check
            label="Éviter les paquets de ressources identiques"
            checked={options.avoidClusters}
            onChange={v => onChange({ avoidClusters: v })}
          />
          <Check
            label="Équilibrer les intersections"
            checked={options.balanceInter}
            onChange={v => onChange({ balanceInter: v })}
          />
          <Check
            label="Éviter les ressources trop concentrées"
            checked={options.penalizeVariance}
            onChange={v => onChange({ penalizeVariance: v })}
          />
          <Check
            label="Pas de port 2:1 adjacent à sa ressource"
            checked={options.avoidPortRes}
            onChange={v => onChange({ avoidPortRes: v })}
          />
        </div>

        <ToleranceRange
          label="Écart de production toléré"
          value={options.tolerancePct}
          onChange={v => onChange({ tolerancePct: v })}
          hint={
            <>
              De chaque ressource par rapport à sa part attendue (∝ à son nombre
              de tuiles). 0 % = parts strictement égales ; plus haut = plus de
              variété.
            </>
          }
        />

        {zones === undefined ? null : (
          <div className="flex flex-col gap-2">
            <Check
              label="Équilibrer aussi au sein des zones"
              checked={options.balanceZones}
              onChange={v => onChange({ balanceZones: v })}
            />
            <span className="text-[11px] text-zinc-400">
              Le même écart, mesuré zone par zone : un continent de départ reste
              jouable même si des îles lointaines portent le reste de la
              production.
            </span>
            {options.balanceZones ? zones : null}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Check
            label="Limiter la force d'une intersection"
            checked={options.limitInterPips}
            onChange={v => onChange({ limitInterPips: v })}
          />
          {options.limitInterPips ? (
            <label className="flex items-center gap-1.5 pl-6 text-sm">
              <span>Maximum</span>
              <input
                type="number"
                min={3}
                max={15}
                value={options.maxInterPips}
                onChange={e =>
                  onChange({ maxInterPips: Number(e.target.value) || 0 })
                }
                aria-label="Pips maximum par intersection"
                className={numField}
              />
              <span>pastilles</span>
            </label>
          ) : null}
          <span className="pl-6 text-[11px] text-zinc-400">
            Somme des pastilles aux sommets où 3 tuiles se rejoignent : un
            plafond évite les emplacements surpuissants en début de partie (les
            intersections faibles, elles, ne gênent pas).
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">
            Candidats évalués (qualité ↔ variété)
          </span>
          <label className="flex items-center justify-between gap-2 text-sm">
            <span>Terrains</span>
            <input
              type="number"
              min={1}
              max={300}
              value={options.terrainN}
              onChange={e =>
                onChange({ terrainN: Math.max(1, Number(e.target.value) || 1) })
              }
              aria-label="Nombre de candidats terrain"
              className={numField}
            />
          </label>
          <label className="flex items-center justify-between gap-2 text-sm">
            <span>Nombres</span>
            <input
              type="number"
              min={1}
              max={300}
              value={options.numberN}
              onChange={e =>
                onChange({ numberN: Math.max(1, Number(e.target.value) || 1) })
              }
              aria-label="Nombre de candidats nombres"
              className={numField}
            />
          </label>
        </div>
      </fieldset>

      <label className="mt-1 flex items-center gap-2 border-t border-black/10 pt-3 text-sm dark:border-white/10">
        <input
          type="checkbox"
          checked={options.ignore}
          onChange={e => onChange({ ignore: e.target.checked })}
          className="h-4 w-4 shrink-0 accent-indigo-600"
        />
        <span>Ignorer toutes les contraintes de placement</span>
      </label>
    </section>
  );
}
