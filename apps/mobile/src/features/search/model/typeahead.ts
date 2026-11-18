// Pure logic of the typeahead. No React, no Apollo.
import { canonicalSearchInput } from './searchParams';

/** How long the text must stay unchanged before the suggestions are requested. */
export const SUGGESTION_DEBOUNCE_MS = 250;

/**
 * The text the suggestions are requested for: the same normalization as a search (NFC, trimmed,
 * single spaces, at most 100 code points), so "pa", "pa " and " pa" are one request and one cache
 * entry. Empty means "no request".
 */
export function suggestionPrefix(text: string): string {
  return canonicalSearchInput({ query: text }).query;
}
