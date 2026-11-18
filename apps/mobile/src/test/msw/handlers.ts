// Ready-made handlers for the cases many tests share. A test adds them with `server.use(...)`.
import { FeedDocument, RecipeDocument } from '@pantry/shared';

import type { CatalogFixture, RecipeDetailsFixture } from '../fixtures';
import { api } from './api';

/** The cursor of item `index`, like the real server's: opaque to the app, so any format works. */
const cursorOf = (index: number) => `cursor-${index}`;

/**
 * One page of `items`, with cursor pagination like the real server: `first` items after the item
 * whose cursor is `after`.
 */
export function pageOf(items: CatalogFixture[], first: number, after?: string | null) {
  const start = after ? Number(after.replace('cursor-', '')) + 1 : 0;
  const nodes = items.slice(start, start + first);

  return {
    edges: nodes.map((node, offset) => ({ cursor: cursorOf(start + offset), node })),
    pageInfo: {
      hasNextPage: start + first < items.length,
      endCursor: nodes.length ? cursorOf(start + nodes.length - 1) : null,
    },
  };
}

/** The feed serves `items`, page by page. */
export const feedOf = (items: CatalogFixture[]) =>
  api.query(FeedDocument, ({ variables }) => ({
    feed: pageOf(items, variables.first, variables.after),
  }));

/** The feed has no items. For tests that render a screen which loads the feed but do not check it. */
export const emptyFeed = () => feedOf([]);

/** `recipe(id)` serves these recipes, and `null` for any other id, like the real server. */
export const recipesOf = (recipes: RecipeDetailsFixture[]) =>
  api.query(RecipeDocument, ({ variables }) => ({
    recipe: recipes.find((recipe) => recipe.id === variables.id) ?? null,
  }));
