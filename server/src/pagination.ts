// Cursor pagination over an in-memory list.
// A cursor is the id of an item, base64url-encoded so clients treat it as opaque.
import { apiError } from './errors';

export const MAX_PAGE_SIZE = 50;

export interface Edge<T> {
  cursor: string;
  node: T;
}

export interface Page<T> {
  edges: Edge<T>[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}

export function encodeCursor(id: string): string {
  return Buffer.from(`id:${id}`, 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string): string {
  const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
  if (!decoded.startsWith('id:') || decoded.length === 3) {
    throw apiError('BAD_USER_INPUT', 'Invalid cursor');
  }
  return decoded.slice(3);
}

export function paginate<T extends { id: string }>(
  items: readonly T[],
  first: number,
  after: string | null | undefined,
): Page<T> {
  if (!Number.isInteger(first) || first < 1) {
    throw apiError('BAD_USER_INPUT', '`first` must be a positive integer');
  }
  const size = Math.min(first, MAX_PAGE_SIZE);

  let start = 0;
  if (after != null) {
    const afterId = decodeCursor(after);
    const index = items.findIndex((item) => item.id === afterId);
    // The cursor's item is not in this list: for example the cursor came from a different search.
    if (index === -1) throw apiError('BAD_USER_INPUT', 'Cursor does not belong to this list');
    start = index + 1;
  }

  const slice = items.slice(start, start + size);
  const edges = slice.map((node) => ({ cursor: encodeCursor(node.id), node }));
  return {
    edges,
    pageInfo: {
      hasNextPage: start + size < items.length,
      endCursor: edges.at(-1)?.cursor ?? null,
    },
  };
}
