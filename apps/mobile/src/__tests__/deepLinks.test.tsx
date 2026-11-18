import { router } from 'expo-router';
import { renderRouter, screen } from 'expo-router/testing-library';

// A deep link `pantry://recipe/r1` (scheme in app.config.ts) reaches the router as the path
// `/recipe/r1`. The step from URL to path runs on the device, because Jest's `URL` does not
// parse custom schemes like the native one. So these tests start at the path, and the full URL
// is checked by hand: `xcrun simctl openurl booted pantry://recipe/r1`.
//
// A cold start is a launch with an initial URL, so each test renders the app with one.
// (The folder is relative to the working directory, which is `apps/mobile` when Jest runs.)
const APP_DIR = './app';

describe('deep links', () => {
  beforeEach(() => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      status: 200,
      json: async () => ({ data: { feed: { edges: [], pageInfo: { hasNextPage: false } } } }),
    } as Response);
  });
  afterEach(() => jest.restoreAllMocks());

  it('opens the recipe screen with the id from the link on a cold start', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/recipe/r1' });

    expect(screen).toHavePathname('/recipe/r1');
    expect(screen.getByText('Details for recipe r1')).toBeOnTheScreen();
  });

  it('opens the product screen with the id from the link on a cold start', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/product/p7' });

    expect(screen).toHavePathname('/product/p7');
    expect(screen.getByText('Details for product p7')).toBeOnTheScreen();
  });

  it('keeps the tabs under the linked screen, so the user can go back', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/recipe/r1' });

    expect(router.canGoBack()).toBe(true);
  });
});
