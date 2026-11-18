import type { FeedRow } from '../model/feed';
import { ProductCard } from './ProductCard';
import { RecipeCard } from './RecipeCard';

/** One row of the feed. `__typename` narrows the node, so each card gets the right type. */
export function FeedRowView({ row }: { row: FeedRow }) {
  const { node } = row;
  return node.__typename === 'Recipe' ? <RecipeCard item={node} /> : <ProductCard item={node} />;
}
