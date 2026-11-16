// Runs before every test file (see jest.config.js). Shared mocks and matchers go here.
// React Native Testing Library registers its matchers (toBeOnTheScreen, ...) and its cleanup itself.

// Order matters: the Unistyles mock first, then the same theme registration the app entry runs.
import { resetTestTheme } from './unistyles';
import '@/design-system/unistyles';

afterEach(() => {
  // A test that switches to fake timers must not leak them into the next test.
  jest.useRealTimers();
  // Same for a test that switches the theme.
  resetTestTheme();
});
