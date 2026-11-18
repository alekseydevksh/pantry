// Which variant a flag has, and why. Pure.
import {
  FLAGS,
  isFlagKey,
  isVariantOf,
  type FlagKey,
  type FlagOverrides,
  type ResolvedFlag,
  type Variant,
} from '../definitions';

/**
 * The order: a local override, then the provider's assignment, then the default. An override or an
 * assignment that is not a variant of the flag is ignored.
 */
export function resolveFlag<K extends FlagKey>(
  key: K,
  { override, assigned }: { override?: unknown; assigned?: unknown },
): ResolvedFlag<K> {
  if (isVariantOf(key, override)) return { variant: override, source: 'override' };
  if (isVariantOf(key, assigned)) return { variant: assigned, source: 'assignment' };
  return { variant: FLAGS[key].defaultVariant as Variant<K>, source: 'default' };
}

/**
 * The valid overrides in `stored` (from storage, so untrusted): known flags with one of their
 * variants. An override of a removed flag or variant is dropped.
 */
export function sanitizeOverrides(stored: unknown): FlagOverrides {
  if (typeof stored !== 'object' || stored === null) return {};
  const valid: Record<string, string> = {};
  for (const [key, value] of Object.entries(stored)) {
    if (isFlagKey(key) && isVariantOf(key, value)) valid[key] = value;
  }
  return valid as FlagOverrides;
}
