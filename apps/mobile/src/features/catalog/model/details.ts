// What a details screen (recipe, product) shows, as a pure function of its query. No React, no Apollo.

export type DetailsStatus =
  /** Nothing to show yet: the first request is running. */
  | 'loading'
  /** The item exists and its details are loaded. */
  | 'ready'
  /** The server answered, and there is no such item (the API returns `null` for an unknown id). */
  | 'notFound'
  /** The request failed and there is nothing to show. */
  | 'error';

export type DetailsQueryState = {
  /** The query has a result. */
  hasData: boolean;
  /** The result says there is no such item. Only meaningful when `hasData`. */
  isMissing: boolean;
  /** The request failed. */
  hasError: boolean;
};

/**
 * `notFound` is not an error: the server answered, so retrying gives the same answer, and the
 * screen offers a way out instead of a retry button.
 */
export function detailsStatus({ hasData, isMissing, hasError }: DetailsQueryState): DetailsStatus {
  if (hasData) return isMissing ? 'notFound' : 'ready';
  if (hasError) return 'error';
  return 'loading';
}

/** "Vegetarian, Vegan": the names of `values` in the user's language, as one line. */
export function joinLabels(values: readonly string[], label: (value: string) => string): string {
  return values.map(label).join(', ');
}
