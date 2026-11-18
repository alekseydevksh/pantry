// Deterministic assignment of a user to a variant (ADR 0012). Pure: the same user, flag, salt and
// weights always give the same variant, on any device, offline, with no server.

/**
 * A 32-bit hash of `text`: FNV-1a, then the murmur3 finalizer (`fmix32`). FNV-1a alone is fast but
 * mixes the last characters poorly, so ids that differ only at the end (`user-1`, `user-2`) would
 * land close together; the finalizer spreads them over the whole range.
 *
 * Changing this function moves users between variants of every running experiment. The golden
 * values in the tests catch that.
 */
export function hash32(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

export type Weights<V extends string> = readonly (readonly [variant: V, weight: number])[];

export type AssignInput<V extends string> = {
  flagKey: string;
  userId: string;
  /** Change it to reshuffle the users of a flag, for a new run of an experiment. */
  salt?: string;
  /** In the order of the flag's definition. Any non-negative scale: 50/50, 1/9, 1/1/1. */
  weights: Weights<V>;
};

/**
 * The variant of `userId`, or `null` when no variant has a weight. The flag key is part of the
 * hash, so two flags with the same weights do not split users the same way.
 */
export function assignVariant<V extends string>({
  flagKey,
  userId,
  salt = '',
  weights,
}: AssignInput<V>): V | null {
  const total = weights.reduce((sum, [, weight]) => sum + weight, 0);
  if (!(total > 0)) return null;

  // A point in [0, total), from the hash in [0, 2^32).
  const point = (hash32(`${salt}:${flagKey}:${userId}`) / 2 ** 32) * total;
  let end = 0;
  let last: V | null = null;
  for (const [variant, weight] of weights) {
    if (weight <= 0) continue;
    end += weight;
    last = variant;
    if (point < end) return variant;
  }
  // Only reached through floating point rounding at the very top of the range.
  return last;
}
