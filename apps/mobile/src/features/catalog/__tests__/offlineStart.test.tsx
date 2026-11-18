// PLAN 2.9: the app starts with what was saved on the device. "Saved" is the persisted Apollo cache
// in MMKV (ADR 0007); a restart is a new cache that restores from the same storage.
import { act, screen, waitFor } from '@testing-library/react-native';

import { FeedDocument } from '@pantry/shared';

import { createCache } from '@/lib/apollo';
import { createCachePersistor } from '@/lib/apollo/persistence/cachePersistor';
import { createMMKVStorage, STORAGE_IDS } from '@/lib/storage';
import { makeCatalog, makeProduct, type CatalogFixture } from '@/test/fixtures';
import { scrollListTo } from '@/test/flashlist-events';
import { api } from '@/test/msw/api';
import { feedOf, pageOf } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { setTestNetwork } from '@/test/network';
import { createTestClient, renderWithProviders } from '@/test/render';

import { HomeScreen } from '../components/HomeScreen';
import { FEED_PAGE_SIZE } from '../model/feed';

/** The user used the app online earlier: the feed was loaded, and the app saved its cache. */
async function usedTheAppBefore(items: CatalogFixture[]) {
  server.use(feedOf(items));
  const cache = createCache();
  const persistor = createCachePersistor({
    cache,
    storage: createMMKVStorage(STORAGE_IDS.apolloCache),
  });
  persistor.start();
  const client = createTestClient({ cache });
  await client.query({ query: FeedDocument, variables: { first: FEED_PAGE_SIZE } });
  // The app saves when it leaves the foreground.
  persistor.flush();
  persistor.stop();
  server.resetHandlers();
}

/** The app starts again: a new, empty cache restores what is in storage, before the first render. */
function startApp() {
  const cache = createCache();
  const result = createCachePersistor({
    cache,
    storage: createMMKVStorage(STORAGE_IDS.apolloCache),
  }).restore();
  expect(result).toBe('restored');
  return createTestClient({ cache });
}

describe('starting the app with a saved feed', () => {
  it('shows the saved feed and the offline banner when there is no network and no server', async () => {
    await usedTheAppBefore(makeCatalog(30));
    setTestNetwork('offline');
    let requests = 0;
    server.use(
      api.query(FeedDocument, () => {
        requests += 1;
        return api.networkError();
      }),
    );

    await renderWithProviders(<HomeScreen />, { client: startApp() });

    // At once, before any request has finished: the saved cards and the banner.
    expect(screen.getByText('Product 1')).toBeOnTheScreen();
    expect(screen.getByText('Recipe 3')).toBeOnTheScreen();
    expect(screen.getByText('You are offline. What you see may be out of date.')).toBeOnTheScreen();

    // The app still asks the server (3 attempts), the request fails, and the screen does not change:
    // no error screen, no empty list, and no second message about the refresh.
    await waitFor(() => expect(requests).toBe(3));
    expect(screen.getByText('Product 1')).toBeOnTheScreen();
    expect(screen.queryByText('Could not load the feed')).not.toBeOnTheScreen();
    expect(screen.queryByText('Could not refresh. Pull down to try again.')).not.toBeOnTheScreen();
    expect(screen.getByText(/You are offline/)).toBeOnTheScreen();
  });

  it('tells the user when the server is down but the device is online, and keeps the saved feed', async () => {
    await usedTheAppBefore(makeCatalog(30));
    server.use(api.query(FeedDocument, () => api.httpError(500)));

    await renderWithProviders(<HomeScreen />, { client: startApp() });

    expect(screen.getByText('Product 1')).toBeOnTheScreen();
    expect(await screen.findByText('Could not refresh. Pull down to try again.')).toBeOnTheScreen();
    expect(screen.queryByText(/You are offline/)).not.toBeOnTheScreen();
    expect(screen.getByText('Product 1')).toBeOnTheScreen();
  });

  it('shows the saved feed first, and replaces it with fresh data when the server answers', async () => {
    await usedTheAppBefore(makeCatalog(30));
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    server.use(
      api.query(FeedDocument, async ({ variables }) => {
        await gate;
        const fresh = [makeProduct(1, { name: 'Fresh product' }), ...makeCatalog(30).slice(1)];
        return { feed: pageOf(fresh, variables.first, variables.after) };
      }),
    );

    await renderWithProviders(<HomeScreen />, { client: startApp() });

    // The server has not answered yet: the saved data is on screen, and there is no spinner or banner.
    expect(screen.getByText('Product 1')).toBeOnTheScreen();
    expect(screen.queryByText('Fresh product')).not.toBeOnTheScreen();
    expect(screen.queryByLabelText('Loading the feed')).not.toBeOnTheScreen();
    expect(screen.queryByText(/You are offline/)).not.toBeOnTheScreen();

    release();

    expect(await screen.findByText('Fresh product')).toBeOnTheScreen();
    expect(screen.queryByText('Product 1')).not.toBeOnTheScreen();
  });

  it('does not load the next page while the first request is still running', async () => {
    await usedTheAppBefore(makeCatalog(60));
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    const requests: (string | null | undefined)[] = [];
    server.use(
      api.query(FeedDocument, async ({ variables }) => {
        requests.push(variables.after);
        if (!variables.after) await gate;
        return { feed: pageOf(makeCatalog(60), variables.first, variables.after) };
      }),
    );
    await renderWithProviders(<HomeScreen />, { client: startApp() });

    // The user scrolls to the end of the saved page while the server has not answered yet. A page
    // appended now would be thrown away when the answer for page one replaces the list.
    await scrollListTo('feed-list', FEED_PAGE_SIZE - 5, FEED_PAGE_SIZE);
    expect(requests).toEqual([undefined]);

    release();
    await waitFor(() => expect(requests.length).toBeGreaterThan(1));
    expect(requests[1]).toBe('cursor-19');
  });
});

describe('starting the app with nothing saved', () => {
  it('shows an error with a retry, not an empty screen, when there is no network', async () => {
    setTestNetwork('offline');
    server.use(api.query(FeedDocument, () => api.networkError()));

    await renderWithProviders(<HomeScreen />);

    expect(await screen.findByText('Could not load the feed')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeOnTheScreen();
    expect(screen.getByText(/You are offline/)).toBeOnTheScreen();
  });

  it('shows the banner as soon as the device goes offline, and hides it when it is back', async () => {
    server.use(feedOf(makeCatalog(3)));
    await renderWithProviders(<HomeScreen />);
    await screen.findByText('Product 1');
    expect(screen.queryByText(/You are offline/)).not.toBeOnTheScreen();

    await act(async () => setTestNetwork('offline'));
    expect(screen.getByText(/You are offline/)).toBeOnTheScreen();

    await act(async () => setTestNetwork('online'));
    expect(screen.queryByText(/You are offline/)).not.toBeOnTheScreen();
  });
});
