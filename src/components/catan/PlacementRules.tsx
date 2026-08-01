import type { ReactNode } from "react";

import type { GeneratorOptions } from "@/lib/catan/generator-options";

const sectionClass =
  "flex w-full max-w-md flex-col gap-2 rounded-xl border border-black/10 p-4 text-sm dark:border-white/10";

/**
 * What the draw was allowed to do, tracking the settings in force. The rules
 * about terrains and numbers belong to the engine, so both generators list the
 * same ones; `head` and `tail` are what the board itself adds around them (its
 * deserts and harbours, or a scenario's fixed spaces and target score).
 */
export function PlacementRules({
  title,
  options,
  head,
  tail,
}: Readonly<{
  title: string;
  options: GeneratorOptions;
  head?: ReactNode;
  tail?: ReactNode;
}>) {
  if (options.ignore) {
    return (
      <section className={sectionClass}>
        <h2 className="font-semibold">{title}</h2>
        <p className="text-zinc-600 dark:text-zinc-300">
          Contraintes <span className="font-semibold">désactivées</span> — le
          plateau est totalement aléatoire : ni les déserts, ni les ressources,
          ni les nombres ne suivent de règle.
        </p>
      </section>
    );
  }

  return (
    <section className={sectionClass}>
      <h2 className="font-semibold">{title}</h2>
      <ul className="flex list-disc flex-col gap-1 pl-4 text-zinc-600 dark:text-zinc-300">
        {head}
        <li>
          Jamais de triangle de trois tuiles de même ressource
          {options.avoidClusters
            ? ", et les terrains identiques sont peu regroupés (pas de gros paquet, au plus ~3 paires adjacentes)"
            : " (les paquets et paires de terrains identiques restent permis)"}
          .
        </li>
        {options.avoidReds ? (
          <li>
            Les nombres rouges{" "}
            <span className="font-semibold text-red-600">6</span> et{" "}
            <span className="font-semibold text-red-600">8</span> ne sont jamais
            adjacents.
          </li>
        ) : null}
        {options.avoidDuplicates ? (
          <li>Deux nombres identiques ne sont jamais adjacents.</li>
        ) : null}
        <li>
          {options.tolerancePct === 0
            ? "Production strictement équilibrée : chaque ressource a exactement sa part attendue"
            : `Production équilibrée : chaque ressource reste à ±${options.tolerancePct} % de sa part attendue`}
          {options.balanceInter
            ? ", et la production est étalée entre les intersections."
            : "."}
        </li>
        {options.balanceZones ? (
          <li>
            Le même écart est tenu{" "}
            <span className="font-semibold">zone par zone</span> sur celles du
            scénario qui le demandent, et pas seulement sur le plateau entier.
          </li>
        ) : null}
        {options.penalizeVariance ? (
          <li>
            Aucune ressource n&apos;est trop concentrée sur une seule tuile
            (production répartie sur ses tuiles).
          </li>
        ) : null}
        {options.limitInterPips ? (
          <li>
            Aucune intersection ne dépasse {options.maxInterPips} pastilles —
            pas d&apos;emplacement surpuissant en début de partie.
          </li>
        ) : null}
        {options.avoidPortRes ? (
          <li>Aucun port 2:1 adjacent à une tuile de sa propre ressource.</li>
        ) : null}
        {tail}
      </ul>
    </section>
  );
}
