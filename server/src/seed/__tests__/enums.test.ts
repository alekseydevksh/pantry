import { buildSchema, GraphQLEnumType } from 'graphql';

import { loadTypeDefs } from '@pantry/shared/schema';

import { ALLERGENS, CATEGORIES, DIETS } from '../schema';

// The seed's Zod enums are written by hand. This keeps them equal to the GraphQL schema.
describe('seed enums', () => {
  const schema = buildSchema(loadTypeDefs());
  const values = (name: string) =>
    (schema.getType(name) as GraphQLEnumType).getValues().map((value) => value.name);

  it.each([
    ['Diet', DIETS],
    ['Allergen', ALLERGENS],
    ['ProductCategory', CATEGORIES],
  ] as const)('%s has the same values as schema.graphql', (name, seedValues) => {
    expect(values(name)).toEqual([...seedValues]);
  });
});
