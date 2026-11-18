// Runs before every test file (see jest.config.js). Shared mocks and matchers go here.
// React Native Testing Library registers its matchers (toBeOnTheScreen, ...) and its cleanup itself.

// Order matters: the Unistyles mock first, then the same theme registration the app entry runs.
import { resetTestReducedMotion } from './reanimated';
import { resetTestTheme } from './unistyles';
import '@/design-system/unistyles';

// Reanimated is native code; see src/test/reanimated.ts. (jest.mock is hoisted above the imports.)
jest.mock('react-native-reanimated', () => jest.requireActual('./reanimated').reanimatedMock);

afterEach(() => {
  // A test that switches to fake timers must not leak them into the next test.
  jest.useRealTimers();
  // Same for a test that switches the theme.
  resetTestTheme();
  resetTestReducedMotion();
});
