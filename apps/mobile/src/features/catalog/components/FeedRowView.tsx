import type { FeedRow } from '../model/feed';
import { CatalogCard } from './CatalogCard';

/** One row of the feed. */
export function FeedRowView({ row }: { row: FeedRow }) {
  return <CatalogCard node={row.node} />;
}
