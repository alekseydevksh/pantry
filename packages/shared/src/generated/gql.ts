/* eslint-disable */
import * as types from './graphql';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "query Feed($first: Int!, $after: String) {\n  feed(first: $first, after: $after) {\n    edges {\n      cursor\n      node {\n        __typename\n        ... on Product {\n          id\n          ...ProductCardFields\n        }\n        ... on Recipe {\n          id\n          ...RecipeCardFields\n        }\n      }\n    }\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n  }\n}": typeof types.FeedDocument,
    "query Product($id: ID!) {\n  product(id: $id) {\n    id\n    ...ProductHeaderFields\n    ...ProductDetailsFields\n  }\n}\n\nfragment ProductHeaderFields on Product {\n  id\n  name\n  imageUrl\n  priceCents\n  unit\n  inStock\n}\n\nfragment ProductDetailsFields on Product {\n  id\n  description\n  diets\n  allergens\n}": typeof types.ProductDocument,
    "fragment ProductCardFields on Product {\n  id\n  name\n  imageUrl\n  priceCents\n  unit\n  inStock\n}": typeof types.ProductCardFieldsFragmentDoc,
    "query Recipe($id: ID!) {\n  recipe(id: $id) {\n    id\n    ...RecipeHeaderFields\n    ...RecipeDetailsFields\n    ...RecipeIngredientsFields\n    ...RecipeStepsFields\n  }\n}\n\nfragment RecipeHeaderFields on Recipe {\n  id\n  name\n  imageUrl\n  cookTimeMin\n  servings\n}\n\nfragment RecipeDetailsFields on Recipe {\n  id\n  description\n  diets\n  allergens\n  priceCents\n}\n\nfragment RecipeIngredientsFields on Recipe {\n  id\n  ingredients {\n    quantity\n    product {\n      id\n      ...IngredientProductFields\n    }\n  }\n}\n\nfragment RecipeStepsFields on Recipe {\n  id\n  steps\n}\n\nfragment IngredientProductFields on Product {\n  id\n  name\n  unit\n  priceCents\n  inStock\n}": typeof types.RecipeDocument,
    "fragment RecipeCardFields on Recipe {\n  id\n  name\n  imageUrl\n  cookTimeMin\n  servings\n}": typeof types.RecipeCardFieldsFragmentDoc,
    "query SearchResults($input: SearchInput!, $first: Int!, $after: String) {\n  search(input: $input, first: $first, after: $after) {\n    edges {\n      cursor\n      node {\n        __typename\n        ... on Product {\n          id\n        }\n        ... on Recipe {\n          id\n        }\n      }\n    }\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    totalCount\n  }\n}": typeof types.SearchResultsDocument,
    "query Suggestions($prefix: String!) {\n  suggestions(prefix: $prefix)\n}": typeof types.SuggestionsDocument,
    "query TestFeed($first: Int!, $after: String) {\n  feed(first: $first, after: $after) {\n    edges {\n      cursor\n      node {\n        __typename\n        ... on Product {\n          id\n          name\n          priceCents\n        }\n        ... on Recipe {\n          id\n          name\n          cookTimeMin\n        }\n      }\n    }\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n  }\n}": typeof types.TestFeedDocument,
};
const documents: Documents = {
    "query Feed($first: Int!, $after: String) {\n  feed(first: $first, after: $after) {\n    edges {\n      cursor\n      node {\n        __typename\n        ... on Product {\n          id\n          ...ProductCardFields\n        }\n        ... on Recipe {\n          id\n          ...RecipeCardFields\n        }\n      }\n    }\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n  }\n}": types.FeedDocument,
    "query Product($id: ID!) {\n  product(id: $id) {\n    id\n    ...ProductHeaderFields\n    ...ProductDetailsFields\n  }\n}\n\nfragment ProductHeaderFields on Product {\n  id\n  name\n  imageUrl\n  priceCents\n  unit\n  inStock\n}\n\nfragment ProductDetailsFields on Product {\n  id\n  description\n  diets\n  allergens\n}": types.ProductDocument,
    "fragment ProductCardFields on Product {\n  id\n  name\n  imageUrl\n  priceCents\n  unit\n  inStock\n}": types.ProductCardFieldsFragmentDoc,
    "query Recipe($id: ID!) {\n  recipe(id: $id) {\n    id\n    ...RecipeHeaderFields\n    ...RecipeDetailsFields\n    ...RecipeIngredientsFields\n    ...RecipeStepsFields\n  }\n}\n\nfragment RecipeHeaderFields on Recipe {\n  id\n  name\n  imageUrl\n  cookTimeMin\n  servings\n}\n\nfragment RecipeDetailsFields on Recipe {\n  id\n  description\n  diets\n  allergens\n  priceCents\n}\n\nfragment RecipeIngredientsFields on Recipe {\n  id\n  ingredients {\n    quantity\n    product {\n      id\n      ...IngredientProductFields\n    }\n  }\n}\n\nfragment RecipeStepsFields on Recipe {\n  id\n  steps\n}\n\nfragment IngredientProductFields on Product {\n  id\n  name\n  unit\n  priceCents\n  inStock\n}": types.RecipeDocument,
    "fragment RecipeCardFields on Recipe {\n  id\n  name\n  imageUrl\n  cookTimeMin\n  servings\n}": types.RecipeCardFieldsFragmentDoc,
    "query SearchResults($input: SearchInput!, $first: Int!, $after: String) {\n  search(input: $input, first: $first, after: $after) {\n    edges {\n      cursor\n      node {\n        __typename\n        ... on Product {\n          id\n        }\n        ... on Recipe {\n          id\n        }\n      }\n    }\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    totalCount\n  }\n}": types.SearchResultsDocument,
    "query Suggestions($prefix: String!) {\n  suggestions(prefix: $prefix)\n}": types.SuggestionsDocument,
    "query TestFeed($first: Int!, $after: String) {\n  feed(first: $first, after: $after) {\n    edges {\n      cursor\n      node {\n        __typename\n        ... on Product {\n          id\n          name\n          priceCents\n        }\n        ... on Recipe {\n          id\n          name\n          cookTimeMin\n        }\n      }\n    }\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n  }\n}": types.TestFeedDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query Feed($first: Int!, $after: String) {\n  feed(first: $first, after: $after) {\n    edges {\n      cursor\n      node {\n        __typename\n        ... on Product {\n          id\n          ...ProductCardFields\n        }\n        ... on Recipe {\n          id\n          ...RecipeCardFields\n        }\n      }\n    }\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n  }\n}"): (typeof documents)["query Feed($first: Int!, $after: String) {\n  feed(first: $first, after: $after) {\n    edges {\n      cursor\n      node {\n        __typename\n        ... on Product {\n          id\n          ...ProductCardFields\n        }\n        ... on Recipe {\n          id\n          ...RecipeCardFields\n        }\n      }\n    }\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query Product($id: ID!) {\n  product(id: $id) {\n    id\n    ...ProductHeaderFields\n    ...ProductDetailsFields\n  }\n}\n\nfragment ProductHeaderFields on Product {\n  id\n  name\n  imageUrl\n  priceCents\n  unit\n  inStock\n}\n\nfragment ProductDetailsFields on Product {\n  id\n  description\n  diets\n  allergens\n}"): (typeof documents)["query Product($id: ID!) {\n  product(id: $id) {\n    id\n    ...ProductHeaderFields\n    ...ProductDetailsFields\n  }\n}\n\nfragment ProductHeaderFields on Product {\n  id\n  name\n  imageUrl\n  priceCents\n  unit\n  inStock\n}\n\nfragment ProductDetailsFields on Product {\n  id\n  description\n  diets\n  allergens\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "fragment ProductCardFields on Product {\n  id\n  name\n  imageUrl\n  priceCents\n  unit\n  inStock\n}"): (typeof documents)["fragment ProductCardFields on Product {\n  id\n  name\n  imageUrl\n  priceCents\n  unit\n  inStock\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query Recipe($id: ID!) {\n  recipe(id: $id) {\n    id\n    ...RecipeHeaderFields\n    ...RecipeDetailsFields\n    ...RecipeIngredientsFields\n    ...RecipeStepsFields\n  }\n}\n\nfragment RecipeHeaderFields on Recipe {\n  id\n  name\n  imageUrl\n  cookTimeMin\n  servings\n}\n\nfragment RecipeDetailsFields on Recipe {\n  id\n  description\n  diets\n  allergens\n  priceCents\n}\n\nfragment RecipeIngredientsFields on Recipe {\n  id\n  ingredients {\n    quantity\n    product {\n      id\n      ...IngredientProductFields\n    }\n  }\n}\n\nfragment RecipeStepsFields on Recipe {\n  id\n  steps\n}\n\nfragment IngredientProductFields on Product {\n  id\n  name\n  unit\n  priceCents\n  inStock\n}"): (typeof documents)["query Recipe($id: ID!) {\n  recipe(id: $id) {\n    id\n    ...RecipeHeaderFields\n    ...RecipeDetailsFields\n    ...RecipeIngredientsFields\n    ...RecipeStepsFields\n  }\n}\n\nfragment RecipeHeaderFields on Recipe {\n  id\n  name\n  imageUrl\n  cookTimeMin\n  servings\n}\n\nfragment RecipeDetailsFields on Recipe {\n  id\n  description\n  diets\n  allergens\n  priceCents\n}\n\nfragment RecipeIngredientsFields on Recipe {\n  id\n  ingredients {\n    quantity\n    product {\n      id\n      ...IngredientProductFields\n    }\n  }\n}\n\nfragment RecipeStepsFields on Recipe {\n  id\n  steps\n}\n\nfragment IngredientProductFields on Product {\n  id\n  name\n  unit\n  priceCents\n  inStock\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "fragment RecipeCardFields on Recipe {\n  id\n  name\n  imageUrl\n  cookTimeMin\n  servings\n}"): (typeof documents)["fragment RecipeCardFields on Recipe {\n  id\n  name\n  imageUrl\n  cookTimeMin\n  servings\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query SearchResults($input: SearchInput!, $first: Int!, $after: String) {\n  search(input: $input, first: $first, after: $after) {\n    edges {\n      cursor\n      node {\n        __typename\n        ... on Product {\n          id\n        }\n        ... on Recipe {\n          id\n        }\n      }\n    }\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    totalCount\n  }\n}"): (typeof documents)["query SearchResults($input: SearchInput!, $first: Int!, $after: String) {\n  search(input: $input, first: $first, after: $after) {\n    edges {\n      cursor\n      node {\n        __typename\n        ... on Product {\n          id\n        }\n        ... on Recipe {\n          id\n        }\n      }\n    }\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    totalCount\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query Suggestions($prefix: String!) {\n  suggestions(prefix: $prefix)\n}"): (typeof documents)["query Suggestions($prefix: String!) {\n  suggestions(prefix: $prefix)\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query TestFeed($first: Int!, $after: String) {\n  feed(first: $first, after: $after) {\n    edges {\n      cursor\n      node {\n        __typename\n        ... on Product {\n          id\n          name\n          priceCents\n        }\n        ... on Recipe {\n          id\n          name\n          cookTimeMin\n        }\n      }\n    }\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n  }\n}"): (typeof documents)["query TestFeed($first: Int!, $after: String) {\n  feed(first: $first, after: $after) {\n    edges {\n      cursor\n      node {\n        __typename\n        ... on Product {\n          id\n          name\n          priceCents\n        }\n        ... on Recipe {\n          id\n          name\n          cookTimeMin\n        }\n      }\n    }\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n  }\n}"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;