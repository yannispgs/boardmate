import { InfoTip } from "@/components/InfoTip";

/**
 * The shared explanation for the normalised time index ("Part du temps" /
 * "Temps"), reused wherever it appears (games tab, player ranking, player
 * detail) so the wording stays in one place.
 */
export function TimeIndexInfo() {
  return (
    <InfoTip label="À propos de cet indice">
      <p>
        <strong>Part du temps.</strong> Indice normalisé par nombre de
        joueurs&nbsp;: <strong>100 = la part attendue</strong> (une répartition
        égale du temps de la table).
      </p>
      <p>
        En dessous de 100 = plus rapide que la moyenne, au-dessus = plus lent.
        Normalisé pour comparer des parties à 3 et à 6 joueurs.
      </p>
    </InfoTip>
  );
}
