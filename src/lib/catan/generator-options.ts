import type { BoardOptions, CatanVariantId } from "./board";

/**
 * The generator's settings in the shape the settings panel holds them: flat
 * booleans and a percentage rather than the engine's fractions and geometry.
 * On the base board they are session-only — every visit starts from the
 * defaults below; a Marins scenario carries its own instead
 * (see {@link scenarioOptions}).
 */
export interface GeneratorOptions {
  /** Base board only: let the desert leave the centre for the inner ring. */
  desertInner: boolean;
  /** Base board only: let the desert leave the centre for the outer coast. */
  desertOuter: boolean;
  /** Let two deserts sit on neighbouring spaces. */
  allowAdjacentDeserts: boolean;
  /** Drop every placement rule at once for a raw shuffle. */
  ignore: boolean;
  /** Allowed deviation from each resource's balanced share, in percent. */
  tolerancePct: number;
  avoidReds: boolean;
  avoidDuplicates: boolean;
  avoidClusters: boolean;
  balanceInter: boolean;
  penalizeVariance: boolean;
  limitInterPips: boolean;
  maxInterPips: number;
  avoidPortRes: boolean;
  terrainN: number;
  numberN: number;
}

/** What the generator applies until someone says otherwise. */
export const DEFAULT_GENERATOR_OPTIONS: GeneratorOptions = {
  desertInner: false,
  desertOuter: false,
  allowAdjacentDeserts: false,
  ignore: false,
  tolerancePct: 20,
  avoidReds: true,
  avoidDuplicates: true,
  avoidClusters: true,
  balanceInter: true,
  penalizeVariance: true,
  limitInterPips: true,
  maxInterPips: 12,
  avoidPortRes: false,
  terrainN: 60,
  numberN: 75,
};

/**
 * The same rules a Marins scenario is drawn under by default. A Seafarers map
 * is printed with its harbours off their own resource, so that rule — optional
 * on the base board — starts on here; the panel can still turn it off.
 */
export const MARINS_GENERATOR_OPTIONS: GeneratorOptions = {
  ...DEFAULT_GENERATOR_OPTIONS,
  avoidPortRes: true,
};

/**
 * The settings one scenario is drawn under: the ones its author saved, over the
 * Marins defaults for everything they left alone. A scenario stored before a
 * setting existed — or before the editor offered any of them — therefore reads
 * as the defaults rather than as nothing at all.
 */
export function scenarioOptions(
  saved?: Partial<GeneratorOptions>,
): GeneratorOptions {
  return { ...MARINS_GENERATOR_OPTIONS, ...saved };
}

/**
 * Maps the panel's settings onto the generator's option shape. `variant` is the
 * board to build, left out entirely by the screens that hand the geometry over
 * themselves (a scenario passes a `variantSpec` instead).
 */
export function toBoardOptions(
  o: GeneratorOptions,
  variant?: CatanVariantId,
): BoardOptions {
  const options: BoardOptions = {
    desertInnerRing: o.desertInner,
    desertOuterRing: o.desertOuter,
    allowAdjacentDeserts: o.allowAdjacentDeserts,
    ignoreConstraints: o.ignore,
    balanceTolerance: o.tolerancePct / 100,
    avoidAdjacentReds: o.avoidReds,
    avoidAdjacentDuplicates: o.avoidDuplicates,
    avoidResourceClusters: o.avoidClusters,
    balanceIntersections: o.balanceInter,
    penalizeResourceVariance: o.penalizeVariance,
    limitIntersectionPips: o.limitInterPips,
    maxIntersectionPips: o.maxInterPips,
    avoidPortOnResource: o.avoidPortRes,
    terrainCandidates: o.terrainN,
    numberCandidates: o.numberN,
  };

  if (variant !== undefined) {
    options.variant = variant;
  }

  return options;
}
