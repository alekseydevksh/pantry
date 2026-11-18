import { View, type ViewProps } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Button } from './Button';
import { Text } from './Text';

export type ErrorStateProps = Omit<ViewProps, 'children'> & {
  /** What went wrong, in a few words: "Couldn't load the feed". */
  title: string;
  /** What the user can do about it. */
  message?: string;
  /** The retry button's text. The caller passes it because it is translated. */
  retryLabel: string;
  onRetry: () => void;
};

/**
 * An inline error with a retry button, for a screen or a list that could not load. It is an
 * `alert`, so a screen reader announces it when it appears.
 */
export function ErrorState({
  title,
  message,
  retryLabel,
  onRetry,
  style,
  ...props
}: ErrorStateProps) {
  return (
    <View
      {...props}
      accessibilityRole="alert"
      // Android announces the content of a live region when it appears; iOS does so for `alert`.
      accessibilityLiveRegion="polite"
      style={[styles.container, style]}
    >
      <Text variant="headline" style={styles.centered}>
        {title}
      </Text>
      {message ? (
        <Text tone="muted" style={styles.centered}>
          {message}
        </Text>
      ) : null}
      <Button title={retryLabel} variant="secondary" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.xl,
  },
  centered: { textAlign: 'center' },
}));
