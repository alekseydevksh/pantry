import { View, type ViewProps } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

export type ScreenProps = ViewProps & {
  /**
   * Keep the content above the home indicator. Default: `true`.
   * Turn it off on a screen inside the tab bar, because the tab bar already covers that area.
   * The top needs nothing: every screen has a navigation header that sits below the notch.
   */
  bottomInset?: boolean;
};

/**
 * The base of a screen: background, padding, and safe-area handling, so a screen never draws
 * content under the home indicator. Insets come from the Unistyles runtime (`rt.insets`), which
 * updates natively, because a third-party SafeAreaView cannot follow a theme change.
 */
export function Screen({ bottomInset = true, style, ...props }: ScreenProps) {
  return <View {...props} style={[styles.screen, bottomInset && styles.bottomInset, style]} />;
}

const styles = StyleSheet.create((theme, rt) => ({
  screen: {
    flex: 1,
    padding: theme.spacing.xl,
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  bottomInset: {
    paddingBottom: rt.insets.bottom + theme.spacing.xl,
  },
}));
