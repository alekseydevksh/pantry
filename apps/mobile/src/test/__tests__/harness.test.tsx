// Tests of the test harness itself (PLAN 2.4): the typed MSW handlers and `renderWithProviders`.
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { screen } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import { FeedDocument } from '@pantry/shared';

import { currentLanguage } from '@/lib/i18n';
import { api } from '@/test/msw/api';
import { server } from '@/test/msw/server';
import { createTestClient, renderWithProviders } from '@/test/render';

const emptyFeed = { feed: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } } };

describe('typed MSW handlers', () => {
  it('give the resolver the typed variables of the document', async () => {
    const seen: number[] = [];
    server.use(
      api.query(FeedDocument, ({ variables }) => {
        seen.push(variables.first);
        return emptyFeed;
      }),
    );

    const result = await createTestClient().query({
      query: FeedDocument,
      variables: { first: 7 },
    });

    expect(result.data).toEqual(emptyFeed);
    expect(seen).toEqual([7]);
  });

  it('count the calls, so a test can fail once and then succeed', async () => {
    server.use(
      api.query(FeedDocument, ({ callCount }) =>
        // 400 is not retried by the retry link, so this is one visible failure.
        callCount === 1 ? api.httpError(400) : emptyFeed,
      ),
    );
    const client = createTestClient();

    await expect(client.query({ query: FeedDocument, variables: { first: 1 } })).rejects.toThrow();
    const second = await client.query({
      query: FeedDocument,
      variables: { first: 1 },
      fetchPolicy: 'network-only',
    });

    expect(second.data).toEqual(emptyFeed);
  });

  it('can answer with a GraphQL error', async () => {
    server.use(api.query(FeedDocument, () => api.graphqlError('boom')));

    await expect(
      createTestClient().query({ query: FeedDocument, variables: { first: 1 } }),
    ).rejects.toThrow('boom');
  });

  it('fail a request that no handler answers, instead of reaching a real server', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      createTestClient().query({ query: FeedDocument, variables: { first: 1 } }),
    ).rejects.toThrow();

    expect(consoleError).toHaveBeenCalled();
  });

  it('match by operation name, so another operation is not answered by mistake', async () => {
    server.use(api.query(FeedDocument, () => emptyFeed));
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const other = gql`
      query SomethingElse {
        cart {
          id
        }
      }
    `;

    await expect(createTestClient().query({ query: other })).rejects.toThrow();
    expect(consoleError).toHaveBeenCalled();
  });
});

describe('renderWithProviders', () => {
  function Feed() {
    const { data, loading } = useQuery(FeedDocument, { variables: { first: 1 } });
    return <Text>{loading ? 'loading' : `edges: ${data?.feed.edges.length}`}</Text>;
  }

  it('gives the component an Apollo client that talks to MSW', async () => {
    server.use(api.query(FeedDocument, () => emptyFeed));

    await renderWithProviders(<Feed />);

    expect(await screen.findByText('edges: 0')).toBeOnTheScreen();
  });

  it('uses a new cache for every render', async () => {
    server.use(api.query(FeedDocument, () => emptyFeed));
    await renderWithProviders(<Feed />);
    await screen.findByText('edges: 0');

    // A second render (`screen` now points to it). A shared cache would show the data at once;
    // a new one starts with "loading".
    await renderWithProviders(<Feed />);

    expect(screen.getByText('loading')).toBeOnTheScreen();
    expect(await screen.findByText('edges: 0')).toBeOnTheScreen();
  });

  it('renders under the dark theme and in Polish on request', async () => {
    function Probe() {
      return <Text>{currentLanguage()}</Text>;
    }

    await renderWithProviders(<Probe />, { theme: 'dark', language: 'pl' });

    expect(screen.getByText('pl')).toBeOnTheScreen();
  });

  it('can render a component as the screen of a route, with its params', async () => {
    function RecipeProbe() {
      const { id } = useLocalSearchParams<{ id: string }>();
      return <Text>{`recipe ${id}`}</Text>;
    }

    await renderWithProviders(<RecipeProbe />, {
      route: { pattern: 'recipe/[id]', url: '/recipe/r42' },
    });

    expect(screen.getByText('recipe r42')).toBeOnTheScreen();
  });
});
