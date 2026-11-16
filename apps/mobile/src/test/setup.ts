// Runs before every test file (see jest.config.js). Shared mocks and matchers go here.
// React Native Testing Library registers its matchers (toBeOnTheScreen, ...) and its cleanup itself.

afterEach(() => {
  // A test that switches to fake timers must not leak them into the next test.
  jest.useRealTimers();
});
