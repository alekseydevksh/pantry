import { StatusBar } from 'expo-status-bar';
import { UnistylesRuntime, useUnistyles } from 'react-native-unistyles';

import type { ThemeName } from '../themes';

/** Light icons on a dark screen, dark icons on a light screen. */
export function statusBarStyleFor(themeName: ThemeName): 'light' | 'dark' {
  return themeName === 'dark' ? 'light' : 'dark';
}

/**
 * The status bar for the active theme. `style="auto"` would follow the system setting, which is
 * wrong when the user picked a theme in Settings. On Android the bar is transparent
 * (edge-to-edge), so the screen background shows through behind it.
 */
export function ThemedStatusBar() {
  // The hook makes this re-render when the theme changes.
  useUnistyles();

  return <StatusBar style={statusBarStyleFor(UnistylesRuntime.themeName as ThemeName)} />;
}
