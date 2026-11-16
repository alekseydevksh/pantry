import {
  buildSchema,
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLObjectType,
  GraphQLUnionType,
  type GraphQLSchema,
} from 'graphql';

import { loadTypeDefs } from '../schema.node';

function fieldNames(schema: GraphQLSchema, typeName: string): string[] {
  const type = schema.getType(typeName);
  if (!(type instanceof GraphQLObjectType) && !(type instanceof GraphQLInputObjectType)) {
    throw new Error(`${typeName} is not an object or input type`);
  }
  return Object.keys(type.getFields()).sort();
}

function argNames(schema: GraphQLSchema, root: 'Query' | 'Mutation', field: string): string[] {
  const type = schema.getType(root) as GraphQLObjectType;
  const def = type.getFields()[field];
  if (!def) throw new Error(`${root}.${field} does not exist`);
  return def.args.map((arg) => arg.name).sort();
}

describe('schema.graphql', () => {
  const schema = buildSchema(loadTypeDefs());

  it('has every query from SPEC section 4', () => {
    expect(fieldNames(schema, 'Query')).toEqual(
      ['cart', 'feed', 'product', 'recipe', 'recommendations', 'search', 'suggestions'].sort(),
    );
  });

  it('has cart mutations that all take an idempotency key', () => {
    expect(fieldNames(schema, 'Mutation')).toEqual(['addToCart', 'removeFromCart', 'setCartQty']);
    for (const mutation of ['addToCart', 'removeFromCart', 'setCartQty']) {
      expect(argNames(schema, 'Mutation', mutation)).toContain('idempotencyKey');
    }
  });

  it('paginates feed and search with cursors', () => {
    expect(argNames(schema, 'Query', 'feed')).toEqual(['after', 'first']);
    expect(argNames(schema, 'Query', 'search')).toEqual(['after', 'first', 'input']);
    expect(fieldNames(schema, 'FeedConnection')).toEqual(['edges', 'pageInfo']);
    expect(fieldNames(schema, 'SearchResult')).toEqual(['edges', 'pageInfo', 'totalCount']);
  });

  it('has the search filters used by the search screen and the AI intent', () => {
    expect(fieldNames(schema, 'SearchFilters')).toEqual(
      ['diets', 'excludeAllergens', 'kind', 'maxPriceCents', 'maxTimeMin'].sort(),
    );
    expect(fieldNames(schema, 'SearchInput')).toEqual(['filters', 'query', 'sort']);
    expect(schema.getType('SortOrder')).toBeInstanceOf(GraphQLEnumType);
    expect(schema.getType('RecContext')).toBeInstanceOf(GraphQLInputObjectType);
  });

  it('lets the feed and search return products and recipes', () => {
    const union = schema.getType('CatalogItem');
    expect(union).toBeInstanceOf(GraphQLUnionType);
    expect((union as GraphQLUnionType).getTypes().map((t) => t.name)).toEqual(['Product', 'Recipe']);
  });

  it('has cart lines with a product and a quantity', () => {
    expect(fieldNames(schema, 'Cart')).toEqual(['id', 'itemCount', 'lines', 'totalCents']);
    expect(fieldNames(schema, 'CartLine')).toEqual(['id', 'lineTotalCents', 'product', 'qty']);
  });
});
