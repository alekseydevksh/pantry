import { Pressable, type PressableProps } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Text } from './Text';

export type ChipProps = Omit<PressableProps, 'children' | 'style'> & {
  /** The visible text. It is also the accessibility label unless `accessibilityLabel` is set. */
  label: string;
  /** Default: `false`. Reported to screen readers through `accessibilityState.selected`. */
  selected?: boolean;
};

/** A small toggle for filters and suggestions. */
export function Chip({
  label,
  selected = false,
  disabled = false,
  accessibilityLabel,
  accessibilityState,
  ...props
}: ChipProps) {
  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ ...accessibilityState, selected, disabled }}
      disabled={disabled}
      style={[styles.chip, selected && styles.selected, disabled && styles.disabled]}
    >
      <Text variant="label" tone={selected ? 'default' : 'muted'}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  chip: {
    // `minHeight`, not `height`: the chip grows with the user's text size.
    minHeight: theme.sizes.minTouchTarget,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primary },
  disabled: { opacity: 0.5 },
}));
