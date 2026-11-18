import type { ReactNode } from 'react';
import { Pressable, type PressableProps } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

export type IconButtonProps = Omit<PressableProps, 'children' | 'style' | 'accessibilityLabel'> & {
  /** Required: the icon has no text, so the label is all a screen reader has. */
  accessibilityLabel: string;
  /** The icon itself (an SVG, an image or a text glyph). No icon library is chosen yet. */
  children: ReactNode;
};

/** A round, icon-only button with a 44 pt touch target. */
export function IconButton({
  accessibilityLabel,
  accessibilityState,
  disabled = false,
  children,
  ...props
}: IconButtonProps) {
  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ ...accessibilityState, disabled }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  button: {
    width: theme.sizes.minTouchTarget,
    height: theme.sizes.minTouchTarget,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: theme.colors.surfaceRaised },
  disabled: { opacity: 0.5 },
}));
