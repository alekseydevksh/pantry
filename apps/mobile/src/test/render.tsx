// `renderWithProviders`: render a component the way the app does (PLAN 2.4).
//
// - Apollo: a NEW client and cache per render, so no data leaks between tests. Retries do not wait.
// - Theme: the Unistyles mock (see ./unistyles.ts); pass `theme` to render under the dark theme.
// - i18n: the global i18next instance; pass `language` to render in Polish. `setup.ts` puts the
//   language back to English after each test.
// - Router: pass `route` to render the component as the screen of that route, inside the real
//   Expo Router (so `useLocalSearchParams` and `router.push` work). Without it there is no
//   navigator, which is enough for components that do not navigate.
//
// To test the real route files in `app/` use `renderApp` instead.
//
// Timers: Expo Router's `renderRouter` (used by `route` and by `renderApp`) turns on Jest's fake
// timers. Real network I/O does not finish while time is faked, so a test that needs data from
// MSW does not use the router: it renders the component without `route` and checks navigation by
// spying on `router.push`.
import type { InMemoryCache } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { act, render, type RenderResult } from '@testing-library/react-native';
import { renderRouter, type RenderRouterResult } from 'expo-router/testing-library';
import type { ReactElement, ReactNode } from 'react';

import type { ThemeName } from '@/design-system';
import { CartSync } from '@/features/cart';
import type * as AppClientModule from '@/lib/apollo/appClient';
import { createApolloClient, createLink } from '@/lib/apollo';
import { API_URL } from '@/lib/config';
import { setLanguage, type Language } from '@/lib/i18n';
import { ToastHost } from '@/lib/toast';

import { setTestTheme } from './unistyles';

export type ProviderOptions = {
  /** Default: a fresh client against the mock API. Pass one to share a cache, or to inspect it. */
  client?: ReturnType<typeof createApolloClient>;
  /** Default: light. */
  theme?: ThemeName;
  /** Default: English. */
  language?: Language;
};

/**
 * A client for tests: the real link chain, but retries do not wait. Pass a `cache` that a
 * persistor has restored, to start the app "with what was saved last time".
 */
export function createTestClient({ cache }: { cache?: InMemoryCache } = {}): ReturnType<
  typeof createApolloClient
> {
  return createApolloClient({
    cache,
    link: createLink({ uri: API_URL, retryDelay: { initial: 0, max: 0, jitter: false } }),
  });
}

async function applyOptions({ theme, language }: ProviderOptions) {
  if (theme) setTestTheme(theme);
  if (language) await act(() => setLanguage(language));
}

function providers(client: ReturnType<typeof createApolloClient>) {
  return function Providers({ children }: { children: ReactNode }) {
    // The same app-wide parts as the root layout: the cart sync, and the toasts it raises.
    return (
      <ApolloProvider client={client}>
        <CartSync />
        {children}
        <ToastHost />
      </ApolloProvider>
    );
  };
}

export type RenderWithProvidersOptions = ProviderOptions & {
  /**
   * Render `ui` as the screen of this route, for example `{ pattern: 'recipe/[id]', url: '/recipe/r1' }`.
   * `pattern` is the route file name as in `app/`; `url` is where the router starts.
   */
  route?: { pattern: string; url: string };
};

export type RenderWithProvidersResult = (RenderResult | RenderRouterResult) & {
  client: ReturnType<typeof createApolloClient>;
};

export async function renderWithProviders(
  ui: ReactElement,
  { client = createTestClient(), route, ...options }: RenderWithProvidersOptions = {},
): Promise<RenderWithProvidersResult> {
  await applyOptions(options);
  const wrapper = providers(client);

  if (route) {
    const result = await renderRouter(
      { [route.pattern]: () => ui },
      { initialUrl: route.url, wrapper },
    );
    return Object.assign(result, { client });
  }

  const result = await render(ui, { wrapper });
  return Object.assign(result, { client });
}

/**
 * Renders the real app: every route file in `app/`, with the root layout and its own Apollo
 * client. That client is shared by the whole test file, so its cache is cleared first, and
 * `initialUrl` is where the router starts.
 */
export async function renderApp(initialUrl: string, options: ProviderOptions = {}) {
  await applyOptions(options);
  // Loaded here, not imported at the top: loading the module restores the persisted cache and
  // starts the persistor, which tests that do not render the whole app should not pay for.
  const { apolloClient, cachePersistor } =
    jest.requireActual<typeof AppClientModule>('@/lib/apollo/appClient');
  // The persistor's save timer would outlive the test and keep the Jest worker from exiting.
  // Tests of persistence build their own persistor (see `createCachePersistor`).
  cachePersistor.stop();
  await apolloClient.clearStore();
  // (Relative to the working directory, which is `apps/mobile` when Jest runs.)
  return renderRouter('./app', { initialUrl });
}

/**
 * The queries the real app (see `renderApp`) is running right now, by operation name, with their
 * variables. For checking that a route sent its id to the screen's query without waiting for the
 * response (Expo Router's fake timers do not let a request finish, see the note at the top).
 */
export function appQueries(): { name: string | undefined; variables: unknown }[] {
  const { apolloClient } = jest.requireActual<typeof AppClientModule>('@/lib/apollo/appClient');
  return [...apolloClient.getObservableQueries()].map((query) => ({
    name: query.queryName,
    variables: query.variables,
  }));
}
