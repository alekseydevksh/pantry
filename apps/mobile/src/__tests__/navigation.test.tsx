import { userEvent } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';

// The real route files in `app/`, not a copy.
// (Relative to the working directory, which is `apps/mobile` when Jest runs.)
const APP_DIR = './app';

function mockFeedFetch() {
  jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    status: 200,
    json: async () => ({ data: { feed: { edges: [], pageInfo: { hasNextPage: false } } } }),
  } as Response);
}

describe('navigation shell', () => {
  beforeEach(mockFeedFetch);
  afterEach(() => jest.restoreAllMocks());

  it.each([
    ['/', 'Home'],
    ['/search', 'Search'],
    ['/cart', 'Cart'],
    ['/settings', 'Settings'],
  ])('opens the %s tab', async (url, title) => {
    await renderRouter(APP_DIR, { initialUrl: url });

    expect(screen).toHavePathname(url);
    expect(screen.getByRole('heading', { name: title })).toBeOnTheScreen();
  });

  it('moves between the four tabs', async () => {
    const user = userEvent.setup();
    await renderRouter(APP_DIR, { initialUrl: '/' });

    await user.press(screen.getByRole('button', { name: /Search/ }));
    expect(screen).toHavePathname('/search');

    await user.press(screen.getByRole('button', { name: /Cart/ }));
    expect(screen).toHavePathname('/cart');

    await user.press(screen.getByRole('button', { name: /Settings/ }));
    expect(screen).toHavePathname('/settings');
  });

  it('opens the recipe screen with the id from the route', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/recipe/r1' });

    expect(screen.getByText('Details for recipe r1')).toBeOnTheScreen();
  });

  it('opens the product screen with the id from the route', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/product/p9' });

    expect(screen.getByText('Details for product p9')).toBeOnTheScreen();
  });

  it('opens the assistant as a modal and closes back to the previous screen', async () => {
    const user = userEvent.setup();
    await renderRouter(APP_DIR, { initialUrl: '/' });

    await user.press(screen.getByRole('button', { name: 'Ask the assistant' }));
    expect(screen).toHavePathname('/assistant');

    await user.press(screen.getByRole('button', { name: 'Close' }));
    expect(screen).toHavePathname('/');
  });

  it('goes home when the assistant is the first screen and is closed', async () => {
    const user = userEvent.setup();
    await renderRouter(APP_DIR, { initialUrl: '/assistant' });

    await user.press(screen.getByRole('button', { name: 'Close' }));

    expect(screen).toHavePathname('/');
  });
});
