import { ActivityIndicator, Pressable, type PressableProps, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Text, type TextTone } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  /** The visible text. It is also the accessibility label unless `accessibilityLabel` is set. */
  title: string;
  /** Default: `primary`. */
  variant?: ButtonVariant;
  /** Shows a spinner, hides no text, and ignores presses. */
  loading?: boolean;
};

const TEXT_TONE: Record<ButtonVariant, TextTone> = {
  primary: 'onPrimary',
  secondary: 'default',
  ghost: 'primary',
  danger: 'onPrimary',
};

export function Button({
  title,
  variant = 'primary',
  loading = false,
  disabled = false,
  accessibilityLabel,
  accessibilityState,
  onPress,
  ...props
}: ButtonProps) {
  const { theme } = useUnistyles();
  const inactive = disabled || loading;
  const spinnerColor = {
    primary: theme.colors.onPrimary,
    secondary: theme.colors.text,
    ghost: theme.colors.primary,
    danger: theme.colors.onDanger,
  }[variant];

  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ ...accessibilityState, disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && pressedStyles[variant],
        inactive && styles.inactive,
      ]}
    >
      <View style={styles.content}>
        {loading && <ActivityIndicator size="small" color={spinnerColor} />}
        <Text variant="label" tone={TEXT_TONE[variant]}>
          {title}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  base: {
    // `minHeight`, not `height`: the button grows with the user's text size.
    minHeight: theme.sizes.minTouchTarget,
    minWidth: theme.sizes.minTouchTarget,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  primary: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  secondary: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
  ghost: { backgroundColor: 'transparent', borderColor: 'transparent' },
  danger: { backgroundColor: theme.colors.danger, borderColor: theme.colors.danger },
  inactive: { opacity: 0.5 },
}));

const pressedStyles = StyleSheet.create((theme) => ({
  primary: {
    backgroundColor: theme.colors.primaryPressed,
    borderColor: theme.colors.primaryPressed,
  },
  secondary: { backgroundColor: theme.colors.surfaceRaised },
  ghost: { backgroundColor: theme.colors.primarySoft },
  danger: { opacity: 0.85 },
}));
