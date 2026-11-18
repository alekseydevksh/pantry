import type { FeedNode } from '../model/feed';
import { ProductCard } from './ProductCard';
import { RecipeCard } from './RecipeCard';

/**
 * The card of a product or a recipe, for any list that shows catalog items (the feed, the search
 * results). `node` holds the type and the id and spreads the card fragments; the card reads the
 * rest from the cache (ADR 0007).
 */
export function CatalogCard({ node }: { node: FeedNode }) {
  return node.__typename === 'Recipe' ? <RecipeCard item={node} /> : <ProductCard item={node} />;
}
