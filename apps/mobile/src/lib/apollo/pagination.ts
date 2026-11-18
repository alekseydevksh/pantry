// Cursor pagination for the Apollo cache (ADR 0007).
//
// A paginated field (`feed`, `search`) is stored as ONE list per set of non-pagination arguments.
// `fetchMore` with `after` adds the next page to that list; a request without `after` (first load,
// refetch, pull-to-refresh) replaces it.
//
// Apollo ships `relayStylePagination`, but it does not drop duplicates when the `after` cursor is
// unknown or pages overlap (the list changed on the server between two pages). A duplicate row
// would also break list keys (FlashList), so this helper removes duplicates by node identity.
import type { FieldPolicy, Reference } from '@apollo/client';

/** The cached shape of a connection: `edges` with a cursor and a node, plus `pageInfo`. */
type CachedEdge = { cursor: string; node: Reference | Record<string, unknown> };
type CachedConnection = { edges: CachedEdge[]; pageInfo: unknown; [field: string]: unknown };

type KeyArgs = FieldPolicy['keyArgs'];

/**
 * Identity of an edge: the normalized node (`Product:p1`), or the cursor when the node is not
 * normalized (it has no id). Two edges with the same identity are the same row on screen.
 */
function edgeKey(edge: CachedEdge): string {
  const ref = (edge.node as Partial<Reference> | null)?.__ref;
  return typeof ref === 'string' ? ref : `cursor:${edge.cursor}`;
}

/**
 * Merge rules, as a pure function so it can be tested on its own:
 * - no `after`: the incoming page replaces the list;
 * - `after` found in the list: keep the edges up to and including it, then the incoming page
 *   (fetching the same page twice gives the same list, not a doubled one);
 * - `after` not found: add the incoming page at the end;
 * - an edge whose node is already in the kept part is dropped;
 * - every other field (`pageInfo`, `totalCount`) comes from the incoming page, the latest one.
 */
export function mergeConnection<T extends CachedConnection>(
  existing: T | undefined,
  incoming: T,
  after: string | null | undefined,
): T {
  if (!existing || after == null) {
    return incoming;
  }

  const index = existing.edges.findIndex((edge) => edge.cursor === after);
  const kept = index === -1 ? existing.edges : existing.edges.slice(0, index + 1);

  const seen = new Set(kept.map(edgeKey));
  const added = incoming.edges.filter((edge) => {
    const key = edgeKey(edge);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { ...incoming, edges: [...kept, ...added] };
}

/**
 * Field policy for a cursor-paginated connection.
 *
 * @param keyArgs the arguments that select a different list. `false` for `feed` (one list);
 * `['input']` for `search` (one list per query, filters and sort). `first` and `after` are never
 * key arguments: they only pick a page of the same list.
 *
 * No custom `read`: Apollo's default returns the merged list, which is what the screens show.
 */
export function cursorPagination(keyArgs: KeyArgs): FieldPolicy<CachedConnection> {
  return {
    keyArgs,
    merge(existing, incoming, { args }) {
      const after = typeof args?.after === 'string' ? args.after : null;
      return mergeConnection(existing, incoming, after);
    },
  };
}
