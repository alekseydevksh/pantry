/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Allergen =
  | 'DAIRY'
  | 'EGGS'
  | 'FISH'
  | 'GLUTEN'
  | 'NUTS'
  | 'PEANUTS'
  | 'SESAME'
  | 'SHELLFISH'
  | 'SOY';

export type CatalogKind =
  | 'PRODUCT'
  | 'RECIPE';

export type Diet =
  | 'DAIRY_FREE'
  | 'GLUTEN_FREE'
  | 'VEGAN'
  | 'VEGETARIAN';

/** All filters are optional and combined with AND. */
export type SearchFilters = {
  /** The item must have every diet in the list. */
  diets?: Array<Diet> | null | undefined;
  /** The item must contain none of these allergens. The app always sets this from the user's settings in code, never only from model output. */
  excludeAllergens?: Array<Allergen> | null | undefined;
  /** Limit results to products or to recipes. Null means both. */
  kind?: CatalogKind | null | undefined;
  /** Price at most this many cents (for a recipe: the price of its ingredients). */
  maxPriceCents?: number | null | undefined;
  /** Recipes only: cook time at most this many minutes. When set, products are left out (they have no cook time). */
  maxTimeMin?: number | null | undefined;
};

export type SearchInput = {
  filters?: SearchFilters | null | undefined;
  /** Free text. An empty string matches everything, so filters can be used alone. */
  query: string;
  /** Defaults to RELEVANCE. */
  sort?: SortOrder | null | undefined;
};

export type SortOrder =
  | 'PRICE_ASC'
  | 'PRICE_DESC'
  /** Best text match first. The default. With an empty query it is the catalog order. */
  | 'RELEVANCE'
  /** Shortest cook time first. Products have no cook time and come after all recipes. */
  | 'TIME_ASC';

export type FeedQueryVariables = Exact<{
  first: number;
  after?: string | null | undefined;
}>;


export type FeedQuery = { feed: { edges: Array<{ cursor: string, node:
        | (
          { __typename: 'Product', id: string }
          & { ' $fragmentRefs'?: { 'ProductCardFieldsFragment': ProductCardFieldsFragment } }
        )
        | (
          { __typename: 'Recipe', id: string }
          & { ' $fragmentRefs'?: { 'RecipeCardFieldsFragment': RecipeCardFieldsFragment } }
        )
       }>, pageInfo: { hasNextPage: boolean, endCursor: string | null } } };

export type ProductQueryVariables = Exact<{
  id: string | number;
}>;


export type ProductQuery = { product: (
    { id: string }
    & { ' $fragmentRefs'?: { 'ProductHeaderFieldsFragment': ProductHeaderFieldsFragment;'ProductDetailsFieldsFragment': ProductDetailsFieldsFragment } }
  ) | null };

export type ProductHeaderFieldsFragment = { id: string, name: string, imageUrl: string, priceCents: number, unit: string, inStock: boolean } & { ' $fragmentName'?: 'ProductHeaderFieldsFragment' };

export type ProductDetailsFieldsFragment = { id: string, description: string, diets: Array<Diet>, allergens: Array<Allergen> } & { ' $fragmentName'?: 'ProductDetailsFieldsFragment' };

export type ProductCardFieldsFragment = { id: string, name: string, imageUrl: string, priceCents: number, unit: string, inStock: boolean } & { ' $fragmentName'?: 'ProductCardFieldsFragment' };

export type RecipeQueryVariables = Exact<{
  id: string | number;
}>;


export type RecipeQuery = { recipe: (
    { id: string }
    & { ' $fragmentRefs'?: { 'RecipeHeaderFieldsFragment': RecipeHeaderFieldsFragment;'RecipeDetailsFieldsFragment': RecipeDetailsFieldsFragment;'RecipeIngredientsFieldsFragment': RecipeIngredientsFieldsFragment;'RecipeStepsFieldsFragment': RecipeStepsFieldsFragment } }
  ) | null };

export type RecipeHeaderFieldsFragment = { id: string, name: string, imageUrl: string, cookTimeMin: number, servings: number } & { ' $fragmentName'?: 'RecipeHeaderFieldsFragment' };

export type RecipeDetailsFieldsFragment = { id: string, description: string, diets: Array<Diet>, allergens: Array<Allergen>, priceCents: number } & { ' $fragmentName'?: 'RecipeDetailsFieldsFragment' };

export type RecipeIngredientsFieldsFragment = { id: string, ingredients: Array<{ quantity: string, product: (
      { id: string }
      & { ' $fragmentRefs'?: { 'IngredientProductFieldsFragment': IngredientProductFieldsFragment } }
    ) }> } & { ' $fragmentName'?: 'RecipeIngredientsFieldsFragment' };

export type RecipeStepsFieldsFragment = { id: string, steps: Array<string> } & { ' $fragmentName'?: 'RecipeStepsFieldsFragment' };

export type IngredientProductFieldsFragment = { id: string, name: string, unit: string, priceCents: number, inStock: boolean } & { ' $fragmentName'?: 'IngredientProductFieldsFragment' };

export type RecipeCardFieldsFragment = { id: string, name: string, imageUrl: string, cookTimeMin: number, servings: number } & { ' $fragmentName'?: 'RecipeCardFieldsFragment' };

export type SearchResultsQueryVariables = Exact<{
  input: SearchInput;
  first: number;
  after?: string | null | undefined;
}>;


export type SearchResultsQuery = { search: { totalCount: number, edges: Array<{ cursor: string, node:
        | (
          { __typename: 'Product', id: string }
          & { ' $fragmentRefs'?: { 'ProductCardFieldsFragment': ProductCardFieldsFragment } }
        )
        | (
          { __typename: 'Recipe', id: string }
          & { ' $fragmentRefs'?: { 'RecipeCardFieldsFragment': RecipeCardFieldsFragment } }
        )
       }>, pageInfo: { hasNextPage: boolean, endCursor: string | null } } };

export type SuggestionsQueryVariables = Exact<{
  prefix: string;
}>;


export type SuggestionsQuery = { suggestions: Array<string> };

export type TestFeedQueryVariables = Exact<{
  first: number;
  after?: string | null | undefined;
}>;


export type TestFeedQuery = { feed: { edges: Array<{ cursor: string, node:
        | { __typename: 'Product', id: string, name: string, priceCents: number }
        | { __typename: 'Recipe', id: string, name: string, cookTimeMin: number }
       }>, pageInfo: { hasNextPage: boolean, endCursor: string | null } } };

export const ProductHeaderFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductHeaderFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Product"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"priceCents"}},{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"inStock"}}]}}]} as unknown as DocumentNode<ProductHeaderFieldsFragment, unknown>;
export const ProductDetailsFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductDetailsFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Product"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"diets"}},{"kind":"Field","name":{"kind":"Name","value":"allergens"}}]}}]} as unknown as DocumentNode<ProductDetailsFieldsFragment, unknown>;
export const ProductCardFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductCardFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Product"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"priceCents"}},{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"inStock"}}]}}]} as unknown as DocumentNode<ProductCardFieldsFragment, unknown>;
export const RecipeHeaderFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RecipeHeaderFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Recipe"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"cookTimeMin"}},{"kind":"Field","name":{"kind":"Name","value":"servings"}}]}}]} as unknown as DocumentNode<RecipeHeaderFieldsFragment, unknown>;
export const RecipeDetailsFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RecipeDetailsFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Recipe"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"diets"}},{"kind":"Field","name":{"kind":"Name","value":"allergens"}},{"kind":"Field","name":{"kind":"Name","value":"priceCents"}}]}}]} as unknown as DocumentNode<RecipeDetailsFieldsFragment, unknown>;
export const IngredientProductFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"IngredientProductFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Product"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"priceCents"}},{"kind":"Field","name":{"kind":"Name","value":"inStock"}}]}}]} as unknown as DocumentNode<IngredientProductFieldsFragment, unknown>;
export const RecipeIngredientsFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RecipeIngredientsFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Recipe"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"ingredients"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"product"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"IngredientProductFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"IngredientProductFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Product"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"priceCents"}},{"kind":"Field","name":{"kind":"Name","value":"inStock"}}]}}]} as unknown as DocumentNode<RecipeIngredientsFieldsFragment, unknown>;
export const RecipeStepsFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RecipeStepsFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Recipe"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"steps"}}]}}]} as unknown as DocumentNode<RecipeStepsFieldsFragment, unknown>;
export const RecipeCardFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RecipeCardFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Recipe"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"cookTimeMin"}},{"kind":"Field","name":{"kind":"Name","value":"servings"}}]}}]} as unknown as DocumentNode<RecipeCardFieldsFragment, unknown>;
export const FeedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Feed"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"after"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"feed"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"Variable","name":{"kind":"Name","value":"after"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cursor"}},{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Product"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductCardFields"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Recipe"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"RecipeCardFields"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}},{"kind":"Field","name":{"kind":"Name","value":"endCursor"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductCardFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Product"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"priceCents"}},{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"inStock"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RecipeCardFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Recipe"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"cookTimeMin"}},{"kind":"Field","name":{"kind":"Name","value":"servings"}}]}}]} as unknown as DocumentNode<FeedQuery, FeedQueryVariables>;
export const ProductDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Product"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"product"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductHeaderFields"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductDetailsFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductHeaderFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Product"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"priceCents"}},{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"inStock"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductDetailsFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Product"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"diets"}},{"kind":"Field","name":{"kind":"Name","value":"allergens"}}]}}]} as unknown as DocumentNode<ProductQuery, ProductQueryVariables>;
export const RecipeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Recipe"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"recipe"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"RecipeHeaderFields"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"RecipeDetailsFields"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"RecipeIngredientsFields"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"RecipeStepsFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"IngredientProductFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Product"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"priceCents"}},{"kind":"Field","name":{"kind":"Name","value":"inStock"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RecipeHeaderFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Recipe"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"cookTimeMin"}},{"kind":"Field","name":{"kind":"Name","value":"servings"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RecipeDetailsFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Recipe"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"diets"}},{"kind":"Field","name":{"kind":"Name","value":"allergens"}},{"kind":"Field","name":{"kind":"Name","value":"priceCents"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RecipeIngredientsFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Recipe"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"ingredients"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"product"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"IngredientProductFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RecipeStepsFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Recipe"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"steps"}}]}}]} as unknown as DocumentNode<RecipeQuery, RecipeQueryVariables>;
export const SearchResultsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SearchResults"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SearchInput"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"after"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"search"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}},{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"Variable","name":{"kind":"Name","value":"after"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cursor"}},{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Product"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductCardFields"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Recipe"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"RecipeCardFields"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}},{"kind":"Field","name":{"kind":"Name","value":"endCursor"}}]}},{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductCardFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Product"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"priceCents"}},{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"inStock"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RecipeCardFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Recipe"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"cookTimeMin"}},{"kind":"Field","name":{"kind":"Name","value":"servings"}}]}}]} as unknown as DocumentNode<SearchResultsQuery, SearchResultsQueryVariables>;
export const SuggestionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Suggestions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"prefix"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"suggestions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"prefix"},"value":{"kind":"Variable","name":{"kind":"Name","value":"prefix"}}}]}]}}]} as unknown as DocumentNode<SuggestionsQuery, SuggestionsQueryVariables>;
export const TestFeedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"TestFeed"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"after"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"feed"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"Variable","name":{"kind":"Name","value":"after"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cursor"}},{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Product"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"priceCents"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Recipe"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"cookTimeMin"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}},{"kind":"Field","name":{"kind":"Name","value":"endCursor"}}]}}]}}]}}]} as unknown as DocumentNode<TestFeedQuery, TestFeedQueryVariables>;