import { act, userEvent } from '@testing-library/react-native';
import { screen } from 'expo-router/testing-library';

import { CartDocument } from '@pantry/shared';

import type * as AppClientModule from '@/lib/apollo/appClient';
import { setLanguage } from '@/lib/i18n';
import { createFakeCart } from '@/test/msw/cartServer';
import { emptyFeed } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { appQueries, renderApp } from '@/test/render';

// `renderApp` renders the real route files in `app/`, not a copy.
const appClient = () =>
  jest.requireActual<typeof AppClientModule>('@/lib/apollo/appClient').apolloClient;

describe('navigation shell', () => {
  beforeEach(() => {
    server.use(emptyFeed());
  });

  it.each([
    ['/', 'Home'],
    ['/search', 'Search'],
    ['/cart', 'Cart'],
    ['/settings', 'Settings'],
  ])('opens the %s tab', async (url, title) => {
    await renderApp(url);

    expect(screen).toHavePathname(url);
    expect(screen.getByRole('heading', { name: title })).toBeOnTheScreen();
  });

  it('moves between the four tabs', async () => {
    const user = userEvent.setup();
    await renderApp('/');

    await user.press(screen.getByRole('button', { name: /Search/ }));
    expect(screen).toHavePathname('/search');

    await user.press(screen.getByRole('button', { name: /Cart/ }));
    expect(screen).toHavePathname('/cart');

    await user.press(screen.getByRole('button', { name: /Settings/ }));
    expect(screen).toHavePathname('/settings');
  });

  it('opens the recipe screen with the id from the route', async () => {
    await renderApp('/recipe/r1');

    expect(screen.getByLabelText('Loading the recipe')).toBeOnTheScreen();
    expect(appQueries()).toContainEqual({ name: 'Recipe', variables: { id: 'r1' } });
  });

  it('opens the product screen with the id from the route', async () => {
    await renderApp('/product/p9');

    expect(screen.getByLabelText('Loading the product')).toBeOnTheScreen();
    expect(appQueries()).toContainEqual({ name: 'Product', variables: { id: 'p9' } });
  });

  it('opens the assistant as a modal and closes back to the previous screen', async () => {
    const user = userEvent.setup();
    await renderApp('/');

    await user.press(screen.getByRole('button', { name: 'Ask the assistant' }));
    expect(screen).toHavePathname('/assistant');

    await user.press(screen.getByRole('button', { name: 'Close' }));
    expect(screen).toHavePathname('/');
  });

  it('goes home when the assistant is the first screen and is closed', async () => {
    const user = userEvent.setup();
    await renderApp('/assistant');

    await user.press(screen.getByRole('button', { name: 'Close' }));

    expect(screen).toHavePathname('/');
  });

  it('shows the screens in Polish, and switches language without a restart', async () => {
    server.use(...createFakeCart().handlers);
    await renderApp('/cart');
    // The last session saved an empty cart. (The router's fake timers do not let a request finish,
    // so this is what the screen shows before the server answers.)
    // (A variable, not a literal: the typed data has no `__typename`, which the cache needs.)
    const emptyCart = {
      __typename: 'Cart',
      id: 'cart',
      itemCount: 0,
      totalCents: 0,
      lines: [],
    };
    await act(() => appClient().writeQuery({ query: CartDocument, data: { cart: emptyCart } }));
    expect(screen.getByRole('heading', { name: 'Cart' })).toBeOnTheScreen();

    await act(async () => {
      await setLanguage('pl');
    });

    // The tab bar title and the screen follow the language.
    expect(screen.getByRole('heading', { name: 'Koszyk' })).toBeOnTheScreen();
    expect(screen.getByText('Twój koszyk jest pusty.')).toBeOnTheScreen();
  });
});
