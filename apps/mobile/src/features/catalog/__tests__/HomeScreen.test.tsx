import { act, screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { FeedDocument } from '@pantry/shared';

import { makeCatalog, makeProduct, makeRecipe, type CatalogFixture } from '@/test/fixtures';
import { api } from '@/test/msw/api';
import { feedOf, pageOf } from '@/test/msw/handlers';
import { scrollListTo } from '@/test/flashlist-events';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';

import { HomeScreen } from '../components/HomeScreen';
import { FEED_PAGE_SIZE } from '../model/feed';

type Request = { first: number; after?: string | null };

/** The feed serves `items` and records every request, so a test can say which pages were asked for. */
function recordedFeed(items: CatalogFixture[]) {
  const requests: Request[] = [];
  const handler = api.query(FeedDocument, ({ variables }) => {
    requests.push({ first: variables.first, after: variables.after });
    return { feed: pageOf(items, variables.first, variables.after) };
  });
  return { requests, handler };
}

/** Scrolls the feed down to its last rows, which is what makes the list ask for the next page. */
const scrollNearEnd = (loadedRows: number) => scrollListTo('feed-list', loadedRows - 5, loadedRows);

async function pullToRefresh() {
  const { refreshControl } = screen.getByTestId('feed-list').props;
  await act(async () => {
    refreshControl.props.onRefresh();
  });
}

describe('HomeScreen: the first page', () => {
  it('shows products and recipes from the first page, and asks for one page only', async () => {
    const { requests, handler } = recordedFeed(makeCatalog(60));
    server.use(handler);

    await renderWithProviders(<HomeScreen />);

    expect(screen.getByRole('header', { name: 'Pantry' })).toBeOnTheScreen();
    expect(await screen.findByText('Product 1')).toBeOnTheScreen();
    expect(screen.getByText('Recipe 3')).toBeOnTheScreen();
    expect(requests).toEqual([{ first: FEED_PAGE_SIZE, after: undefined }]);
    // Page two is not loaded until the user gets near the end.
    expect(screen.queryByText('Product 22')).not.toBeOnTheScreen();
  });

  it('shows placeholders while it loads, then replaces them with the cards', async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    server.use(
      api.query(FeedDocument, async () => {
        await gate;
        return { feed: pageOf([makeProduct(1)], FEED_PAGE_SIZE) };
      }),
    );

    await renderWithProviders(<HomeScreen />);

    expect(screen.getByRole('progressbar', { name: 'Loading the feed' })).toBeOnTheScreen();
    expect(screen.queryByText('Product 1')).not.toBeOnTheScreen();

    release();

    expect(await screen.findByText('Product 1')).toBeOnTheScreen();
    expect(screen.queryByRole('progressbar', { name: 'Loading the feed' })).not.toBeOnTheScreen();
  });

  it('describes each card to a screen reader as a button with the facts that matter', async () => {
    server.use(feedOf([makeProduct(1, { unit: '1 kg', priceCents: 249 }), makeRecipe(2)]));

    await renderWithProviders(<HomeScreen />);

    expect(
      await screen.findByRole('button', { name: 'Product 1, product, 1 kg, €2.49' }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Recipe 2, recipe, 22 minutes' })).toBeOnTheScreen();
  });

  it('shows the cook time and servings of a recipe, and when a product is out of stock', async () => {
    server.use(
      feedOf([makeRecipe(1, { cookTimeMin: 35, servings: 1 }), makeProduct(2, { inStock: false })]),
    );

    await renderWithProviders(<HomeScreen />);

    expect(await screen.findByText('35 min · 1 serving')).toBeOnTheScreen();
    expect(screen.getByText('Out of stock')).toBeOnTheScreen();
  });

  it('shows the cards in Polish, with the Polish plural of servings', async () => {
    server.use(feedOf([makeRecipe(1, { servings: 2 }), makeRecipe(2, { servings: 5 })]));

    await renderWithProviders(<HomeScreen />, { language: 'pl' });

    expect(await screen.findByText('21 min · 2 porcje')).toBeOnTheScreen();
    expect(screen.getByText('22 min · 5 porcji')).toBeOnTheScreen();
  });

  it('says so when the feed is empty', async () => {
    server.use(feedOf([]));

    await renderWithProviders(<HomeScreen />);

    expect(await screen.findByText('There is nothing here yet.')).toBeOnTheScreen();
  });
});

describe('HomeScreen: more pages', () => {
  it('loads the next page near the end, and adds it to the list', async () => {
    const { requests, handler } = recordedFeed(makeCatalog(60));
    server.use(handler);
    await renderWithProviders(<HomeScreen />);
    await screen.findByText('Product 1');

    await scrollNearEnd(FEED_PAGE_SIZE);
    await waitFor(() => expect(requests).toHaveLength(2));

    // Page two starts after the last item of page one.
    expect(requests).toEqual([
      { first: FEED_PAGE_SIZE, after: undefined },
      { first: FEED_PAGE_SIZE, after: 'cursor-19' },
    ]);
    // The list is now 40 rows long, and the new rows are in it.
    await scrollListTo('feed-list', 27, 2 * FEED_PAGE_SIZE);
    expect(await screen.findByText('Product 29')).toBeOnTheScreen();
  });

  it('asks for one page at a time, however often the list reports the end', async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    const items = makeCatalog(60);
    const requests: Request[] = [];
    server.use(
      api.query(FeedDocument, async ({ variables }) => {
        requests.push({ first: variables.first, after: variables.after });
        // Page two is slow, so the list reports the end again while it is still loading.
        if (variables.after) await gate;
        return { feed: pageOf(items, variables.first, variables.after) };
      }),
    );
    await renderWithProviders(<HomeScreen />);
    await screen.findByText('Product 1');

    await scrollNearEnd(FEED_PAGE_SIZE);
    await scrollNearEnd(FEED_PAGE_SIZE);
    await scrollNearEnd(FEED_PAGE_SIZE);
    expect(screen.getByLabelText('Loading more…')).toBeOnTheScreen();
    release();
    await waitFor(() => expect(screen.queryByLabelText('Loading more…')).not.toBeOnTheScreen());

    expect(requests.filter((request) => request.after)).toHaveLength(1);
  });

  it('stops asking after the last page, and says that the user has seen everything', async () => {
    const { requests, handler } = recordedFeed(makeCatalog(25));
    server.use(handler);
    await renderWithProviders(<HomeScreen />);
    await screen.findByText('Product 1');

    await scrollNearEnd(FEED_PAGE_SIZE);
    await waitFor(() => expect(requests).toHaveLength(2));
    await scrollNearEnd(25);

    expect(await screen.findByText('You have seen everything.')).toBeOnTheScreen();
    expect(requests).toHaveLength(2);
  });

  it('shows a retry in the footer when a page fails, and keeps the cards it has', async () => {
    const items = makeCatalog(60);
    server.use(
      api.query(FeedDocument, ({ variables, callCount }) =>
        // The first request works. The next three are all the attempts of the second request (the
        // retry link tries three times), so it fails. The fifth, after the retry button, works.
        callCount >= 2 && callCount <= 4
          ? api.networkError()
          : { feed: pageOf(items, variables.first, variables.after) },
      ),
    );
    await renderWithProviders(<HomeScreen />);
    await screen.findByText('Product 1');

    await scrollNearEnd(FEED_PAGE_SIZE);

    expect(await screen.findByText('Could not load more items.')).toBeOnTheScreen();
    // The rows that were loaded are still there (the list is at row 15: "Recipe 18" is in view).
    expect(screen.getByText('Recipe 18')).toBeOnTheScreen();

    // The list does not retry by itself, however often it reports the end.
    await scrollNearEnd(FEED_PAGE_SIZE);
    const user = userEvent.setup();
    await user.press(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() =>
      expect(screen.queryByText('Could not load more items.')).not.toBeOnTheScreen(),
    );
    await scrollListTo('feed-list', 27, 2 * FEED_PAGE_SIZE);
    expect(await screen.findByText('Product 29')).toBeOnTheScreen();
  });
});

describe('HomeScreen: refresh', () => {
  it('replaces the list with a fresh first page', async () => {
    let items = makeCatalog(60);
    const requests: Request[] = [];
    server.use(
      api.query(FeedDocument, ({ variables }) => {
        requests.push({ first: variables.first, after: variables.after });
        return { feed: pageOf(items, variables.first, variables.after) };
      }),
    );
    await renderWithProviders(<HomeScreen />);
    await screen.findByText('Product 1');
    await scrollNearEnd(FEED_PAGE_SIZE);
    await waitFor(() => expect(requests).toHaveLength(2));

    // The catalog changes on the server: the first product is renamed.
    items = [makeProduct(1, { name: 'Renamed product' }), ...items.slice(1)];
    await pullToRefresh();
    // The refresh asks for the first page again, without `after`...
    await waitFor(() => expect(requests.length).toBeGreaterThanOrEqual(3));
    expect(requests[2]).toEqual({ first: FEED_PAGE_SIZE, after: undefined });
    // ...and the first row shows the new name.
    await scrollListTo('feed-list', 0, FEED_PAGE_SIZE);
    expect(await screen.findByText('Renamed product')).toBeOnTheScreen();
  });

  it('keeps the list and says so when the refresh fails', async () => {
    const items = makeCatalog(30);
    server.use(
      api.query(FeedDocument, ({ variables, callCount }) =>
        callCount === 1
          ? { feed: pageOf(items, variables.first, variables.after) }
          : api.networkError(),
      ),
    );
    await renderWithProviders(<HomeScreen />);
    await screen.findByText('Product 1');

    await pullToRefresh();

    expect(await screen.findByText('Could not refresh. Pull down to try again.')).toBeOnTheScreen();
    expect(screen.getByText('Product 1')).toBeOnTheScreen();
  });
});

describe('HomeScreen: errors', () => {
  it('shows an error with a retry when the first page cannot be loaded', async () => {
    server.use(
      api.query(FeedDocument, ({ variables, callCount }) =>
        // The retry link makes three attempts, so the first three calls are one failed request.
        callCount <= 3
          ? api.networkError()
          : { feed: pageOf(makeCatalog(5), variables.first, variables.after) },
      ),
    );
    await renderWithProviders(<HomeScreen />);

    expect(await screen.findByText('Could not load the feed')).toBeOnTheScreen();
    expect(screen.queryByText('Product 1')).not.toBeOnTheScreen();

    const user = userEvent.setup();
    await user.press(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Product 1')).toBeOnTheScreen();
    expect(screen.queryByText('Could not load the feed')).not.toBeOnTheScreen();
  });
});

describe('HomeScreen: opening something', () => {
  afterEach(() => jest.restoreAllMocks());

  it('opens the recipe, product and assistant screens from the cards and the button', async () => {
    server.use(feedOf(makeCatalog(6)));
    const push = jest.spyOn(router, 'push').mockImplementation(() => {});
    const user = userEvent.setup();
    await renderWithProviders(<HomeScreen />);

    await user.press(await screen.findByRole('button', { name: /^Recipe 3, recipe,/ }));
    await user.press(screen.getByRole('button', { name: /^Product 2, product,/ }));
    await user.press(screen.getByRole('button', { name: 'Ask the assistant' }));

    expect(push.mock.calls).toEqual([
      [{ pathname: '/recipe/[id]', params: { id: 'r3' } }],
      [{ pathname: '/product/[id]', params: { id: 'p2' } }],
      ['/assistant'],
    ]);
  });
});
