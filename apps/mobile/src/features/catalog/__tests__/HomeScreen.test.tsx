import { render, screen } from '@testing-library/react-native';

import type { FeedPreviewQuery } from '@pantry/shared';

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

// MSW replaces this hand-made fetch mock in task 2.4.
function mockFetch(implementation: () => Promise<unknown>) {
  return jest.spyOn(globalThis, 'fetch').mockImplementation(implementation as typeof fetch);
}

describe('HomeScreen (Phase 0 placeholder)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the app name as a header and items loaded from the API', async () => {
    const fetchSpy = mockFetch(async () => ({ status: 200, json: async () => ({ data: feed }) }));

    await render(<HomeScreen />);

    expect(screen.getByRole('header', { name: 'Pantry' })).toBeOnTheScreen();
    expect(await screen.findByText('Tomato Basil Spaghetti · 20 min')).toBeOnTheScreen();
    expect(screen.getByText('Tomatoes · €2.49')).toBeOnTheScreen();

    // The request carries the generated document and its variables.
    const body = JSON.parse(fetchSpy.mock.calls[0]?.[1]?.body as string);
    expect(body.query).toContain('query FeedPreview');
    expect(body.variables).toEqual({ first: 4 });
  });

  it('explains how to start the server when the API is not reachable', async () => {
    mockFetch(async () => {
      throw new TypeError('Network request failed');
    });

    await render(<HomeScreen />);

    expect(await screen.findByText(/mock API is not reachable/)).toBeOnTheScreen();
  });
});
