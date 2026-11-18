import { gql } from '@apollo/client';

import { TestFeedDocument } from '@pantry/shared';

import { setErrorReporter, type ErrorContext } from '@/lib/observability';
import { jsonResponse } from '@/test/fetch';

import { createApolloClient } from '../client';
import { createLink } from '../links';

// `fetch` is overloaded, so `Parameters<typeof fetch>` would drop `URL` from the input type.
type FetchArgs = [input: RequestInfo | URL, init?: RequestInit];

const json = jsonResponse;

const emptyFeed = { feed: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } } };

const networkDown = () => Promise.reject(new TypeError('Network request failed'));
const ok = () => Promise.resolve(json({ data: emptyFeed }));

describe('Apollo link chain', () => {
  let restoreReporter = () => {};
  const reports: { error: unknown; context: ErrorContext }[] = [];

  beforeEach(() => {
    reports.length = 0;
    restoreReporter = setErrorReporter((error, context) => reports.push({ error, context }));
  });
  afterEach(() => restoreReporter());

  function client(responses: (() => Promise<Response>)[]) {
    const fetchMock = jest.fn<Promise<Response>, FetchArgs>();
    for (const next of responses) fetchMock.mockImplementationOnce(next);
    const apollo = createApolloClient({
      link: createLink({
        uri: 'https://api.test/graphql',
        fetch: fetchMock,
        retryDelay: { initial: 0, max: 0, jitter: false },
      }),
    });
    return { apollo, fetchMock };
  }

  it('sends the generated document and its variables', async () => {
    const { apollo, fetchMock } = client([ok]);

    await apollo.query({ query: TestFeedDocument, variables: { first: 4 } });

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.operationName).toBe('TestFeed');
    expect(body.variables).toEqual({ first: 4 });
  });

  it('retries a network error and does not report a request that succeeds in the end', async () => {
    const { apollo, fetchMock } = client([networkDown, ok]);

    const result = await apollo.query({ query: TestFeedDocument, variables: { first: 4 } });

    expect(result.data).toEqual(emptyFeed);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(reports).toHaveLength(0);
  });

  it('gives up after 3 attempts and reports the error once', async () => {
    const { apollo, fetchMock } = client([networkDown, networkDown, networkDown, ok]);

    await expect(
      apollo.query({ query: TestFeedDocument, variables: { first: 4 } }),
    ).rejects.toThrow('Network request failed');

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(reports).toHaveLength(1);
    expect(reports[0]?.context).toEqual({
      source: 'apollo',
      extra: { operationName: 'TestFeed', kind: 'network', status: null },
    });
  });

  it('retries HTTP 503 and reports it with the status', async () => {
    const unavailable = () => Promise.resolve(json({}, 503));
    const { apollo, fetchMock } = client([unavailable, unavailable, unavailable]);

    await expect(
      apollo.query({ query: TestFeedDocument, variables: { first: 4 } }),
    ).rejects.toThrow();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(reports[0]?.context.extra).toMatchObject({ kind: 'server', status: 503 });
  });

  it('does not retry GraphQL errors, and reports them', async () => {
    const invalid = () =>
      Promise.resolve(json({ data: null, errors: [{ message: 'Invalid cursor' }] }));
    const { apollo, fetchMock } = client([invalid, ok]);

    await expect(
      apollo.query({ query: TestFeedDocument, variables: { first: 4 } }),
    ).rejects.toThrow('Invalid cursor');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(reports[0]?.context.extra).toMatchObject({ kind: 'graphql', status: null });
  });

  it('does not retry or report a cancelled request', async () => {
    const aborted = () =>
      Promise.reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
    const { apollo, fetchMock } = client([aborted, ok]);

    await expect(
      apollo.query({ query: TestFeedDocument, variables: { first: 4 } }),
    ).rejects.toThrow('Aborted');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(reports).toHaveLength(0);
  });
});

describe('data masking', () => {
  // A product row whose component owns its fields through a fragment.
  const QUERY = gql`
    query MaskedFeed {
      feed(first: 1) {
        edges {
          cursor
          node {
            ... on Product {
              id
              ...ProductRowFields
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }

    fragment ProductRowFields on Product {
      name
      priceCents
    }
  `;
  const FRAGMENT = gql`
    fragment ProductRowFields on Product {
      name
      priceCents
    }
  `;

  const response = {
    data: {
      feed: {
        edges: [
          {
            cursor: 'c1',
            node: { __typename: 'Product', id: 'p1', name: 'Tomatoes', priceCents: 249 },
          },
        ],
        pageInfo: { hasNextPage: false, endCursor: 'c1' },
      },
    },
  };

  it('hides fragment fields from the query result and keeps them in the cache', async () => {
    const apollo = createApolloClient({
      link: createLink({
        uri: 'https://api.test/graphql',
        fetch: async () => json(response),
      }),
    });

    const { data } = await apollo.query<{
      feed: { edges: { node: Record<string, unknown> }[] };
    }>({ query: QUERY });

    // The query sees only what it selected itself: the id, not the fragment's fields.
    const node = data?.feed.edges[0]?.node;
    expect(node).toEqual({ __typename: 'Product', id: 'p1' });

    // The fragment's owner reads its fields from the cache (useFragment does the same).
    expect(apollo.cache.readFragment({ fragment: FRAGMENT, id: 'Product:p1' })).toEqual({
      __typename: 'Product',
      name: 'Tomatoes',
      priceCents: 249,
    });
  });
});
