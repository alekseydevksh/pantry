import { router } from 'expo-router';
import { screen } from 'expo-router/testing-library';

import { emptyFeed } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { appQueries, renderApp } from '@/test/render';

// A deep link `pantry://recipe/r1` (scheme in app.config.ts) reaches the router as the path
// `/recipe/r1`. The step from URL to path runs on the device, because Jest's `URL` does not
// parse custom schemes like the native one. So these tests start at the path, and the full URL
// is checked by hand: `xcrun simctl openurl booted pantry://recipe/r1`.
//
// A cold start is a launch with an initial URL, so each test renders the app with one.

describe('deep links', () => {
  beforeEach(() => {
    server.use(emptyFeed());
  });

  it('opens the recipe screen with the id from the link on a cold start', async () => {
    await renderApp('/recipe/r1');

    expect(screen).toHavePathname('/recipe/r1');
    expect(screen.getByLabelText('Loading the recipe')).toBeOnTheScreen();
    expect(appQueries()).toContainEqual({ name: 'Recipe', variables: { id: 'r1' } });
  });

  it('opens the product screen with the id from the link on a cold start', async () => {
    await renderApp('/product/p7');

    expect(screen).toHavePathname('/product/p7');
    expect(screen.getByText('Details for product p7')).toBeOnTheScreen();
  });

  it('keeps the tabs under the linked screen, so the user can go back', async () => {
    await renderApp('/recipe/r1');

    expect(router.canGoBack()).toBe(true);
  });
});
