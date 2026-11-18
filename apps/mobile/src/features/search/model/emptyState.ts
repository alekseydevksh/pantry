// What the empty states of the search say. Pure TypeScript.
import type { SearchInput } from '@pantry/shared';

import { activeFilterCount } from './filters';

/**
 * Searches to try from an empty screen or an empty result. They are catalog words (the seed catalog
 * is English), like product names, so they are not translated.
 */
export const SUGGESTED_QUERIES = ['pasta', 'soup', 'vegan', 'breakfast', 'quick dinner'] as const;

/**
 * Why a search found nothing, as far as the input can tell:
 * - `productsHaveNoTime`: products have no cook time, so `kind=product` with a time limit can never
 *   match (ADR 0010 keeps such a link as asked, and the screen explains it).
 * - `filters`: some filter is on, so removing it may help.
 * - `text`: only the words are left to change.
 */
export type EmptyReason = 'productsHaveNoTime' | 'filters' | 'text';

export function emptyReason(input: SearchInput): EmptyReason {
  const filters = input.filters;
  if (filters?.kind === 'PRODUCT' && filters.maxTimeMin != null) return 'productsHaveNoTime';
  return activeFilterCount(input) > 0 ? 'filters' : 'text';
}
