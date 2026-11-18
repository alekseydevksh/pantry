// Public API of the design system. Components get their values from the theme:
//   import { StyleSheet } from 'react-native-unistyles';
//   const styles = StyleSheet.create((theme) => ({ box: { padding: theme.spacing.lg } }));
// The primitives are added in tasks 1.2 (Text, Button) and 1.3 (Card, Chip, Skeleton, IconButton).
export { Button } from './primitives/Button';
export type { ButtonProps, ButtonVariant } from './primitives/Button';
export { Text } from './primitives/Text';
export type { TextProps, TextTone, TextVariant } from './primitives/Text';
export { darkTheme, lightTheme, themes } from './themes';
export type { Theme, ThemeColors, ThemeName } from './themes';
