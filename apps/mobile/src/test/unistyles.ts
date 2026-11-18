// Unistyles in Jest. The real library is native code (Nitro), so tests use the mock that
// ships with it. That mock always returns the first registered theme, and its `setTheme`
// does nothing. This file adds theme switching on top, so a test can render under each theme.
//
// One difference from the app: on a device, native code restyles the views without a
// re-render. Here a StyleSheet is resolved when a component reads it, so after
// `setTestTheme` a test must re-render (`screen.rerender`) to see the new values.
// Components that call `useUnistyles()` re-render by themselves.
import 'react-native-unistyles/mocks';

import { useSyncExternalStore } from 'react';

import { themes, type ThemeName } from '@/design-system/themes';

const DEFAULT_THEME: ThemeName = 'light';

let activeTheme: ThemeName = DEFAULT_THEME;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Switch the theme in a test. Wrap in `act` when a component is mounted. */
export function setTestTheme(name: ThemeName) {
  activeTheme = name;
  listeners.forEach((listener) => listener());
}

export function resetTestTheme() {
  setTestTheme(DEFAULT_THEME);
}

// The mock module is a plain object. Its members are loosely typed here because this file
// replaces a few of them with test versions.
type StyleFactory = (theme: unknown, runtime: unknown) => Record<string, unknown>;
type UnistylesMock = {
  StyleSheet: {
    create: (styles: StyleFactory | Record<string, unknown>) => Record<string, unknown>;
  };
  UnistylesRuntime: Record<string, unknown>;
  useUnistyles: () => { theme: unknown; rt: unknown };
};

const mock = jest.requireMock<UnistylesMock>('react-native-unistyles');
const createWithFirstTheme = mock.StyleSheet.create;

mock.StyleSheet.create = (styles) => {
  if (typeof styles !== 'function') {
    return createWithFirstTheme(styles);
  }

  // Resolve the stylesheet once per theme, when a style is first read under that theme.
  const resolved = new Map<ThemeName, Record<string, unknown>>();
  const forActiveTheme = () => {
    let sheet = resolved.get(activeTheme);
    if (!sheet) {
      const theme = themes[activeTheme];
      sheet = createWithFirstTheme((_firstTheme, runtime) => styles(theme, runtime));
      resolved.set(activeTheme, sheet);
    }
    return sheet;
  };

  return new Proxy(
    {},
    {
      get: (_target, key) => forActiveTheme()[key as string],
      has: (_target, key) => key in forActiveTheme(),
      ownKeys: () => Reflect.ownKeys(forActiveTheme()),
      getOwnPropertyDescriptor: (_target, key) => {
        const descriptor = Reflect.getOwnPropertyDescriptor(forActiveTheme(), key);
        // A proxy may only report configurable properties for keys its target does not have.
        return descriptor && { ...descriptor, configurable: true };
      },
    },
  );
};

function useUnistyles() {
  const name = useSyncExternalStore(subscribe, () => activeTheme);
  return { theme: themes[name], rt: mock.UnistylesRuntime };
}
mock.useUnistyles = useUnistyles;

Object.defineProperty(mock.UnistylesRuntime, 'themeName', {
  get: () => activeTheme,
  configurable: true,
});
mock.UnistylesRuntime.getTheme = (name: ThemeName = activeTheme) => themes[name];
mock.UnistylesRuntime.setTheme = setTestTheme;
// "Follow the system" means the light theme in tests, because the test device is always light.
mock.UnistylesRuntime.setAdaptiveThemes = (enabled: boolean) => {
  if (enabled) setTestTheme(DEFAULT_THEME);
};
