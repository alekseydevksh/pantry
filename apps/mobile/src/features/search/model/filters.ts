// The filter chips and the sort: which options there are, and how a tap changes the search.
// Pure TypeScript. Every change returns a canonical input (ADR 0010), so the result can go
// straight to the route.
import type { Allergen, Diet, SearchFilters, SearchInput, SortOrder } from '@pantry/shared';

import { canonicalSearchInput } from './searchParams';

/** Cook-time chips, in minutes. */
export const TIME_OPTIONS_MIN = [15, 30, 60] as const;
/** Price chips, in cents. */
export const PRICE_OPTIONS_CENTS = [500, 1000, 2000] as const;

/**
 * The chips of a count filter: the presets, plus the value of the search when it is none of them.
 * A link can say `maxTime=45`: the filter is on, so the user must see it and be able to turn it off.
 */
export function countOptions(
  presets: readonly number[],
  current: number | null | undefined,
): number[] {
  if (current == null || presets.includes(current)) return [...presets];
  return [...presets, current].sort((a, b) => a - b);
}

function withFilters(input: SearchInput, change: Partial<SearchFilters>): SearchInput {
  return canonicalSearchInput({ ...input, filters: { ...input.filters, ...change } });
}

function toggled<T extends string>(list: readonly T[] | null | undefined, value: T): T[] {
  const current = list ?? [];
  return current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
}

export const toggleDiet = (input: SearchInput, diet: Diet): SearchInput =>
  withFilters(input, { diets: toggled(input.filters?.diets, diet) });

export const toggleAllergen = (input: SearchInput, allergen: Allergen): SearchInput =>
  withFilters(input, { excludeAllergens: toggled(input.filters?.excludeAllergens, allergen) });

/** The chip that is already selected turns the filter off. */
export const toggleMaxTime = (input: SearchInput, minutes: number): SearchInput =>
  withFilters(input, { maxTimeMin: input.filters?.maxTimeMin === minutes ? null : minutes });

export const toggleMaxPrice = (input: SearchInput, cents: number): SearchInput =>
  withFilters(input, { maxPriceCents: input.filters?.maxPriceCents === cents ? null : cents });

export const setSort = (input: SearchInput, sort: SortOrder): SearchInput =>
  canonicalSearchInput({ ...input, sort });

/** How many filters are on: each diet, each allergen, the time and the price count once. */
export function activeFilterCount(input: SearchInput): number {
  const filters = input.filters;
  if (!filters) return 0;
  return (
    (filters.diets?.length ?? 0) +
    (filters.excludeAllergens?.length ?? 0) +
    (filters.maxTimeMin != null ? 1 : 0) +
    (filters.maxPriceCents != null ? 1 : 0) +
    (filters.kind ? 1 : 0)
  );
}
