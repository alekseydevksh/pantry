// Public API of the design system. Components get their values from the theme:
//   import { StyleSheet } from 'react-native-unistyles';
//   const styles = StyleSheet.create((theme) => ({ box: { padding: theme.spacing.lg } }));
// The primitives (Text, Button, ...) are added in tasks 1.2 and 1.3.
export { darkTheme, lightTheme, themes } from './themes';
export type { Theme, ThemeColors, ThemeName } from './themes';
