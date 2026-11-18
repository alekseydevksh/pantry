import { gql } from '@apollo/client';
import { CombinedGraphQLErrors, ServerError, ServerParseError } from '@apollo/client/errors';

import { RequestTimeoutError } from '../fetchWithTimeout';
import { shouldRetry } from '../retry';

const QUERY = gql`
  query Feed {
    feed(first: 1) {
      pageInfo {
        hasNextPage
      }
    }
  }
`;
const MUTATION = gql`
  mutation Add($productId: ID!, $idempotencyKey: ID!) {
    addToCart(productId: $productId, qty: 1, idempotencyKey: $idempotencyKey) {
      id
    }
  }
`;

const query = { query: QUERY, variables: {} };
const keyedMutation = { query: MUTATION, variables: { productId: 'p1', idempotencyKey: 'k1' } };
const unkeyedMutation = { query: MUTATION, variables: { productId: 'p1' } };

const response = (status: number) => new Response('', { status });
const serverError = (status: number) =>
  new ServerError('Server error', { response: response(status), bodyText: '' });
const abortError = Object.assign(new Error('Aborted'), { name: 'AbortError' });

describe('shouldRetry', () => {
  it.each([
    ['a network failure', new TypeError('Network request failed'), true],
    ['our request timeout', new RequestTimeoutError(15_000), true],
    ['HTTP 500', serverError(500), true],
    ['HTTP 503', serverError(503), true],
    ['HTTP 400', serverError(400), false],
    ['HTTP 404', serverError(404), false],
    [
      'GraphQL errors',
      new CombinedGraphQLErrors({ errors: [{ message: 'Invalid cursor' }], data: null }),
      false,
    ],
    [
      'a response that is not JSON',
      new ServerParseError(new SyntaxError('Unexpected token'), {
        response: response(200),
        bodyText: '<html>',
      }),
      false,
    ],
    ['an aborted request', abortError, false],
  ])('for a query: %s → %p', (_, error, expected) => {
    expect(shouldRetry(error, query)).toBe(expected);
  });

  it('retries a mutation that carries an idempotency key', () => {
    expect(shouldRetry(new TypeError('Network request failed'), keyedMutation)).toBe(true);
  });

  it('never retries a mutation without an idempotency key', () => {
    expect(shouldRetry(new TypeError('Network request failed'), unkeyedMutation)).toBe(false);
    expect(
      shouldRetry(new TypeError('Network request failed'), {
        query: MUTATION,
        variables: { idempotencyKey: '' },
      }),
    ).toBe(false);
  });

  it('does not retry a keyed mutation that failed with a client error', () => {
    expect(shouldRetry(serverError(400), keyedMutation)).toBe(false);
  });
});
