import { ApolloProvider } from '@apollo/client/react';
import { render, screen } from '@testing-library/react-native';

import type { FeedPreviewQuery } from '@pantry/shared';

import { darkTheme } from '@/design-system';
import { createApolloClient, createLink } from '@/lib/apollo';
import { jsonResponse, mockFetch } from '@/test/fetch';
import { setTestTheme } from '@/test/unistyles';

import { HomeScreen } from '../components/HomeScreen';

const feed: FeedPreviewQuery = {
  feed: {
    edges: [
      {
        cursor: 'c1',
        node: { __typename: 'Recipe', id: 'r1', name: 'Tomato Basil Spaghetti', cookTimeMin: 20 },
      },
      {
        cursor: 'c2',
        node: { __typename: 'Product', id: 'p1', name: 'Tomatoes', priceCents: 249 },
      },
    ],
    pageInfo: { hasNextPage: true, endCursor: 'c2' },
  },
};

// A new client for every test, so no cached data leaks between tests, and retries that do not wait.
// `renderWithProviders` (task 2.4) replaces this.
async function renderHome() {
  const client = createApolloClient({
    link: createLink({
      uri: 'https://api.test/graphql',
      retryDelay: { initial: 0, max: 0, jitter: false },
    }),
  });
  return render(
    <ApolloProvider client={client}>
      <HomeScreen />
    </ApolloProvider>,
  );
}

const feedResponse = async () => jsonResponse({ data: feed });

describe('HomeScreen (Phase 0 placeholder)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the app name as a header and items loaded from the API', async () => {
    const fetchSpy = mockFetch(feedResponse);

    await renderHome();

    expect(screen.getByRole('header', { name: 'Pantry' })).toBeOnTheScreen();
    expect(await screen.findByText('Tomato Basil Spaghetti · 20 min')).toBeOnTheScreen();
    expect(screen.getByText('Tomatoes · €2.49')).toBeOnTheScreen();

    // The request carries the generated document and its variables.
    const body = JSON.parse(fetchSpy.mock.calls[0]?.[1]?.body as string);
    expect(body.query).toContain('query FeedPreview');
    expect(body.variables).toEqual({ first: 4 });
  });

  it('uses the colors of the active theme', async () => {
    mockFetch(feedResponse);
    setTestTheme('dark');

    await renderHome();

    expect(screen.getByRole('header', { name: 'Pantry' })).toHaveStyle({
      color: darkTheme.colors.text,
    });
    expect(await screen.findByText('Tomatoes · €2.49')).toHaveStyle({
      color: darkTheme.colors.text,
    });
  });

  it('explains how to start the server when the API is not reachable', async () => {
    mockFetch(async () => {
      throw new TypeError('Network request failed');
    });

    await renderHome();

    expect(await screen.findByText(/mock API is not reachable/)).toBeOnTheScreen();
  });
});
