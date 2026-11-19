// How the Apollo cache stores the API's data (ADR 0007).
//
// Every entity with an `id` is normalized as `Typename:id` (`Product:p1`, `CartLine:p1`, `Cart:...`)
// by default, so no `keyFields` are needed. Types without an id (`PageInfo`, edges,
// `RecipeIngredient`) are stored inside their parent.
import type { TypePolicies } from '@apollo/client';

import { possibleTypesResult } from '@pantry/shared';

import { cursorPagination } from './pagination';

export const typePolicies: TypePolicies = {
  Cart: {
    fields: {
      // Every cart response is the whole cart, so the new lines replace the old ones (a removed line
      // must go). Without this Apollo warns that cache data may be lost.
      lines: { merge: false },
    },
  },
  Query: {
    fields: {
      // One feed for everybody: no key arguments.
      feed: cursorPagination(false),
      // One list per search input. Apollo serializes `input` with sorted keys, so key order does not
      // matter, but `{ filters: null }` and no `filters` are two lists: every input is built by
      // `canonicalSearchInput` in features/search/model/searchParams.ts (ADR 0010).
      search: cursorPagination(['input']),
    },
  },
};

/** Union and interface members, generated from the schema (`CatalogItem` = Product | Recipe). */
export const possibleTypes = possibleTypesResult.possibleTypes;
