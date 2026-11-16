// Registers the themes with Unistyles. This must run before any `StyleSheet.create`,
// so it is the first import of the app entry (apps/mobile/index.ts) and of the Jest setup.
import { StyleSheet } from 'react-native-unistyles';

import { themes } from './themes';

type AppThemes = typeof themes;

// Makes `theme` typed in every `StyleSheet.create((theme) => ...)` and in `useUnistyles()`.
declare module 'react-native-unistyles' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Unistyles reads the theme types from this interface; it only extends AppThemes
  export interface UnistylesThemes extends AppThemes {}
}

StyleSheet.configure({
  themes,
  settings: {
    // Follow the system light/dark setting. Task 1.7 adds the user's choice
    // (system / light / dark) on top with `UnistylesRuntime.setAdaptiveThemes` and `setTheme`.
    adaptiveThemes: true,
  },
});
