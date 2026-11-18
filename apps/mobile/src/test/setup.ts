// Runs before every test file (see jest.config.js). Shared mocks and matchers go here.
// React Native Testing Library registers its matchers (toBeOnTheScreen, ...) and its cleanup itself.

// Order matters: the Unistyles mock first, then the same theme registration the app entry runs.
import { act } from '@testing-library/react-native';

import { startTestAnalytics } from './analytics';
import { resetTestMMKV } from './mmkv';
import { resetTestNetwork } from './network';
import { server } from './msw/server';
import { resetTestReducedMotion } from './reanimated';
import { resetTestInsets, resetTestTheme } from './unistyles';
import '@/design-system/unistyles';
import { currentLanguage, setLanguage } from '@/lib/i18n';

// (`jest.mock` calls are hoisted above the imports.)
// The device language must not decide the result of a test: the tests run in English.
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', languageTag: 'en-US' }],
}));

// Reanimated is native code; see src/test/reanimated.ts.
jest.mock('react-native-reanimated', () => jest.requireActual('./reanimated').reanimatedMock);
// Expo Router's testing library mocks Reanimated again when a test file imports it, with
// `react-native-reanimated/mock`, which lacks what our components use (`useReducedMotion`). Pointing
// that module at our mock keeps Reanimated the same whatever a test file imports first.
jest.mock('react-native-reanimated/mock', () => jest.requireActual('./reanimated').reanimatedMock);

// FlashList measures its rows on the native side; see src/test/flashlist.ts.
jest.mock('@shopify/flash-list/dist/recyclerview/utils/measureLayout', () =>
  jest.requireActual('./flashlist').measureLayoutMock(),
);

// The network state is native code; see src/test/network.ts.
jest.mock('expo-network', () => jest.requireActual('./network').expoNetworkMock);

// MMKV is native code; see src/test/mmkv.ts. Each id keeps its values until the end of the test.
jest.mock('react-native-mmkv', () => jest.requireActual('./mmkv').mmkvMock);

// The API is MSW (see ./msw): a request that no handler answers fails the test.
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterAll(() => server.close());

// Each test starts a new analytics session with a memory sink; see ./analytics.ts.
beforeEach(() => startTestAnalytics());

afterEach(async () => {
  server.resetHandlers();
  // A test that switches to fake timers must not leak them into the next test.
  jest.useRealTimers();
  // Same for a test that switches the theme.
  resetTestTheme();
  resetTestInsets();
  resetTestReducedMotion();
  resetTestMMKV();
  resetTestNetwork();
  // ...and the language.
  // (Inside `act`: a screen from the test may still be mounted and re-render.)
  if (currentLanguage() !== 'en') {
    await act(() => setLanguage('en'));
  }
});
