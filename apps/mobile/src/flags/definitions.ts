// The feature flags the app knows, with their variants and the variant to use when nothing else
// decides (ADR 0012). Code owns the shape of a flag; flags.json owns the rollout (who gets what).
//
// To add a flag: add it here, add its rollout to flags.json, read it with `useFlag` (CLAUDE.md).

type FlagDefinition<V extends readonly [string, ...string[]]> = {
  /** What the flag changes, for the debug panel. */
  description: string;
  /** The variants, in a fixed order. The order is part of the assignment: do not reorder. */
  variants: V;
  /** The variant when the flag is off, missing from the config, or broken. */
  defaultVariant: V[number];
};

/** Keeps the variant names as literal types and checks that the default is one of them. */
function defineFlag<const V extends readonly [string, ...string[]]>(
  definition: FlagDefinition<V>,
): FlagDefinition<V> {
  return definition;
}

export const FLAGS = {
  search_layout: defineFlag({
    description: 'Search results as a list or as a grid (A/B test, PLAN 3.8).',
    variants: ['list', 'grid'],
    defaultVariant: 'list',
  }),
};

export type FlagKey = keyof typeof FLAGS;

/** The variants of flag `K`, for example `'list' | 'grid'`. */
export type Variant<K extends FlagKey> = (typeof FLAGS)[K]['variants'][number];

/** Why a flag has its variant. */
export type FlagSource = 'override' | 'assignment' | 'default';

export type ResolvedFlag<K extends FlagKey> = { variant: Variant<K>; source: FlagSource };

/** Local overrides, from the debug panel. */
export type FlagOverrides = { [K in FlagKey]?: Variant<K> };

export const FLAG_KEYS = Object.keys(FLAGS) as FlagKey[];

export function isFlagKey(value: unknown): value is FlagKey {
  return typeof value === 'string' && Object.hasOwn(FLAGS, value);
}

export function isVariantOf<K extends FlagKey>(key: K, value: unknown): value is Variant<K> {
  return (FLAGS[key].variants as readonly unknown[]).includes(value);
}
