// Runs before every test file (see jest.config.js). Shared mocks and matchers go here.
// React Native Testing Library registers its matchers (toBeOnTheScreen, ...) and its cleanup itself.

// Order matters: the Unistyles mock first, then the same theme registration the app entry runs.
import { act } from '@testing-library/react-native';

import { resetTestMMKV } from './mmkv';
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

// MMKV is native code; see src/test/mmkv.ts. Each id keeps its values until the end of the test.
jest.mock('react-native-mmkv', () => jest.requireActual('./mmkv').mmkvMock);

afterEach(async () => {
  // A test that switches to fake timers must not leak them into the next test.
  jest.useRealTimers();
  // Same for a test that switches the theme.
  resetTestTheme();
  resetTestInsets();
  resetTestReducedMotion();
  resetTestMMKV();
  // ...and the language.
  // (Inside `act`: a screen from the test may still be mounted and re-render.)
  if (currentLanguage() !== 'en') {
    await act(() => setLanguage('en'));
  }
});
