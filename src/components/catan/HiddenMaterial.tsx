import type { HiddenZoneMaterial } from "@/lib/catan/hidden-material";
import { HiddenZoneCard } from "./HiddenZoneCard";

/**
 * What to take out of the box for the fog: the tiles to shuffle face down and
 * the tokens to keep aside. The board says nothing of where they go — that is
 * the players' to find out — so this is a preparation list, not a map.
 */
export function HiddenMaterial({
  zones,
  className,
}: Readonly<{ zones: HiddenZoneMaterial[]; className: string }>) {
  return (
    <section className={className}>
      <h2 className="font-semibold text-sm">🌫️ Matériel à préparer</h2>
      <p className="text-xs text-zinc-600 dark:text-zinc-300">
        Ces tuiles se mélangent face cachée et se posent sur les cases «&nbsp;?
        &nbsp;» du plateau. Les jetons restent de côté : on en tire un quand une
        tuile est retournée.
      </p>

      <ul className="flex flex-col gap-4">
        {zones.map(zone => (
          <HiddenZoneCard
            key={zone.name}
            zone={zone}
            named={zones.length > 1}
          />
        ))}
      </ul>
    </section>
  );
}
