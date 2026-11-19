import { act, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { screen } from 'expo-router/testing-library';

import { SearchResultsDocument } from '@pantry/shared';

import { trackedEvents } from '@/test/analytics';
import { makeProduct, makeProductDetails } from '@/test/fixtures';
import { api } from '@/test/msw/api';
import { createFakeCart } from '@/test/msw/cartServer';
import { emptyFeed, noSuggestions, pageOf, productsOf } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { setTestNetwork } from '@/test/network';
import { renderApp } from '@/test/render';

// Whole flows through the real routes in `app/`, the real Apollo client, the queue and MSW as the
// server (PLAN 3.12). The unit and screen tests check the parts; these check that they fit.
//
// `renderApp` turns on fake timers, and a request does not finish while time is faked (see
// test/render.tsx). A flow that needs the server therefore goes back to the real timers once the
// router is up. Nothing here waits for a debounce or a backoff, so it needs no fake time.

const catalog = [1, 2, 3, 4].map((n) => makeProduct(n, { name: `Soup ${n}`, priceCents: 100 * n }));
const vegan = new Set(['p2', 'p3']);

/** `search` serves the soups; with the vegan filter, only the vegan ones. */
function soupSearch() {
  const inputs: unknown[] = [];
  const handler = api.query(SearchResultsDocument, ({ variables }) => {
    inputs.push(variables.input);
    const onlyVegan = variables.input.filters?.diets?.includes('VEGAN') ?? false;
    const items = onlyVegan ? catalog.filter((item) => vegan.has(item.id)) : catalog;
    return {
      search: { ...pageOf(items, variables.first, variables.after), totalCount: items.length },
    };
  });
  return { inputs, handler };
}

async function openApp(url: string) {
  await renderApp(url);
  jest.useRealTimers();
  return userEvent.setup();
}

describe('flow: search → filter → open a result → add to cart', () => {
  it('ends with the product in the cart, on the screen and on the server', async () => {
    const { inputs, handler } = soupSearch();
    const cart = createFakeCart({ products: catalog });
    server.use(
      emptyFeed(),
      noSuggestions(),
      handler,
      productsOf(catalog.map((item) => makeProductDetails(Number(item.id.slice(1)), item))),
      ...cart.handlers,
    );
    const user = await openApp('/search');

    // Search.
    await user.type(screen.getByLabelText('Search groceries and recipes'), 'soup', {
      submitEditing: true,
    });
    expect(await screen.findByText('Soup 1')).toBeOnTheScreen();
    expect(screen.getByText('4 results')).toBeOnTheScreen();

    // Filter: the route and the results follow.
    await user.press(screen.getByRole('button', { name: /^Filters/ }));
    await user.press(screen.getByRole('button', { name: 'Vegan' }));
    await waitFor(() => expect(screen.queryByText('Soup 1')).not.toBeOnTheScreen());
    expect(screen).toHaveSearchParams({ q: 'soup', diet: 'vegan' });
    expect(screen.getByText('2 results')).toBeOnTheScreen();
    expect(inputs.at(-1)).toMatchObject({ query: 'soup', filters: { diets: ['VEGAN'] } });

    // Open the second result.
    await user.press(screen.getByRole('button', { name: /^Soup 3,/ }));
    expect(screen).toHavePathname('/product/p3');
    expect(await screen.findByRole('button', { name: 'Add to cart' })).toBeOnTheScreen();

    // Add it: the screen shows it at once, and the server gets it.
    await user.press(screen.getByRole('button', { name: 'Add to cart' }));
    expect(await screen.findByText('1 in your cart')).toBeOnTheScreen();
    await waitFor(() => expect(cart.lines()).toEqual({ p3: 1 }));

    // The cart tab shows what the server has.
    await act(() => router.navigate('/cart'));
    expect(screen).toHavePathname('/cart');
    expect(await screen.findByText('Soup 3')).toBeOnTheScreen();
    expect(screen.getByText('1 item')).toBeOnTheScreen();
    expect(screen.getByText('Total: €3.00')).toBeOnTheScreen();

    // One funnel: submit, click, add, in one session.
    const funnel = trackedEvents()
      .events.filter((event) =>
        ['search_submitted', 'search_result_clicked', 'add_to_cart'].includes(event.name),
      )
      .map((event) => event.name);
    expect(funnel).toEqual(['search_submitted', 'search_result_clicked', 'add_to_cart']);
    expect(new Set(trackedEvents().events.map((event) => event.sessionId)).size).toBe(1);
  });
});

describe('flow: offline add → reconnect → the server cart matches', () => {
  it('keeps the adds made offline, merges them, and sends them once the network is back', async () => {
    const cart = createFakeCart({ products: catalog, lines: [{ productId: 'p1', qty: 1 }] });
    server.use(
      emptyFeed(),
      productsOf(catalog.map((item) => makeProductDetails(Number(item.id.slice(1)), item))),
      ...cart.handlers,
    );
    const user = await openApp('/product/p2');
    expect(await screen.findByRole('button', { name: 'Add to cart' })).toBeOnTheScreen();
    // The cart was loaded for the add (and holds the soup from before).
    await waitFor(() => expect(cart.cartQueries()).toBeGreaterThan(0));

    // The network goes away. Two adds of the same product.
    await act(() => setTestNetwork('offline'));
    await user.press(screen.getByRole('button', { name: 'Add to cart' }));
    await user.press(screen.getByRole('button', { name: 'Add to cart' }));

    // The screen already shows both, and the server heard nothing.
    expect(await screen.findByText('2 in your cart')).toBeOnTheScreen();
    expect(cart.requests).toHaveLength(0);
    expect(cart.lines()).toEqual({ p1: 1 });

    // The network comes back.
    await act(() => setTestNetwork('online'));

    // One request, one key, the merged quantity; the server cart matches what was on the screen.
    await waitFor(() => expect(cart.lines()).toEqual({ p1: 1, p2: 2 }));
    expect(cart.requests).toEqual([
      { productId: 'p2', qty: 2, idempotencyKey: expect.any(String) },
    ]);

    // (The product screen has no tab bar: go to the cart the way a link would.)
    await act(() => router.navigate('/cart'));
    expect(await screen.findByText('Soup 1')).toBeOnTheScreen();
    expect(screen.getByText('Soup 2')).toBeOnTheScreen();
    expect(screen.getByText('3 items')).toBeOnTheScreen();
    expect(screen.getByText('Total: €5.00')).toBeOnTheScreen();
    await waitFor(() => expect(screen.queryByText(/waiting to sync/)).not.toBeOnTheScreen());
  });
});
