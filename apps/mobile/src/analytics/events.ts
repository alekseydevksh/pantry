// The analytics event schema: every event the app sends, with the exact shape of its props.
// Add an event here first, then call `track()` (CLAUDE.md). `track('name', props)` does not compile
// for a name that is not here, or for props that do not match.
//
// Props must not hold personal data beyond what the event needs. The search text is free text that
// a user typed, so it can hold anything; it is cut to 100 code points (ADR 0010) and is sent because
// search analytics are useless without it (ADR 0011).
import type { SortOrder } from '@pantry/shared';

/** Where the text of a submitted search came from. */
export type SearchSource = 'field' | 'suggestion' | 'empty_state';

/** The kind of catalog item a result is. */
export type CatalogItemType = 'product' | 'recipe';

export type AnalyticsEvents = {
  /** The user submitted a search (a deep link that opens a search does not count). */
  search_submitted: {
    /** The canonical text (ADR 0010). Can be `''` when only filters are set. */
    query: string;
    source: SearchSource;
    filterCount: number;
    sort: SortOrder;
  };
  /** The user opened a search result. */
  search_result_clicked: {
    query: string;
    /** 1-based place of the item in the list. */
    position: number;
    itemId: string;
    itemType: CatalogItemType;
  };
  /** A search came back empty. Sent once per search shown, not again on refresh. */
  search_zero_results: {
    query: string;
    filterCount: number;
  };
};

export type EventName = keyof AnalyticsEvents;
