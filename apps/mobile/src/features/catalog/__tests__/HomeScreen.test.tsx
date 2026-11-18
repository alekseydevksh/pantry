import { screen } from '@testing-library/react-native';

import { FeedPreviewDocument, type FeedPreviewQuery } from '@pantry/shared';

import { darkTheme } from '@/design-system';
import { api } from '@/test/msw/api';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';

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

// The first screen test that gets its data from MSW (PLAN 2.4). Task 2.5 replaces this screen
// with the real feed and its tests.
describe('HomeScreen (Phase 0 placeholder)', () => {
  it('shows the app name as a header and items loaded from the API', async () => {
    const variables: unknown[] = [];
    server.use(
      api.query(FeedPreviewDocument, (info) => {
        variables.push(info.variables);
        return feed;
      }),
    );

    await renderWithProviders(<HomeScreen />);

    expect(screen.getByRole('header', { name: 'Pantry' })).toBeOnTheScreen();
    expect(await screen.findByText('Tomato Basil Spaghetti · 20 min')).toBeOnTheScreen();
    expect(screen.getByText('Tomatoes · €2.49')).toBeOnTheScreen();
    // The request carries the variables of the generated document.
    expect(variables).toEqual([{ first: 4 }]);
  });

  it('uses the colors of the active theme', async () => {
    server.use(api.query(FeedPreviewDocument, () => feed));

    await renderWithProviders(<HomeScreen />, { theme: 'dark' });

    expect(screen.getByRole('header', { name: 'Pantry' })).toHaveStyle({
      color: darkTheme.colors.text,
    });
    expect(await screen.findByText('Tomatoes · €2.49')).toHaveStyle({
      color: darkTheme.colors.text,
    });
  });

  it('shows prices in the number style of the language', async () => {
    server.use(api.query(FeedPreviewDocument, () => feed));

    await renderWithProviders(<HomeScreen />, { language: 'pl' });

    expect(await screen.findByText(/Tomatoes · 2,49/)).toBeOnTheScreen();
  });

  it('explains how to start the server when the API is not reachable', async () => {
    server.use(api.query(FeedPreviewDocument, () => api.networkError()));

    await renderWithProviders(<HomeScreen />);

    expect(await screen.findByText(/mock API is not reachable/)).toBeOnTheScreen();
  });
});
