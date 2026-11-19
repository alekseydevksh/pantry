import type { ReactNode } from 'react';
import { Pressable } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { StyleSheet } from 'react-native-unistyles';

import { Text } from '@/design-system';
import { useTranslation } from '@/lib/i18n';

export type SwipeToRemoveProps = {
  children: ReactNode;
  /** The row was swiped open: the user wants it gone. */
  onRemove: () => void;
  /** Names the product for the action's label. */
  name: string;
};

/**
 * Swipe a row to the left to remove it. The row follows the finger on the UI thread (Gesture
 * Handler 3 runs the pan and Reanimated moves the view, no round trip to JS), and opening the
 * panel removes the line. A tap on the revealed "Remove" does the same.
 *
 * It is a shortcut, not the only way: the row has a "Remove" button that is always there, so a
 * screen reader, a switch or a keyboard user never needs the gesture. The revealed panel is
 * therefore hidden from assistive technology (it only repeats that button).
 *
 * Reduced motion: the swipe moves with the finger, which is the user's own motion. The animation
 * after the release (settling open or closed) is a Reanimated spring with `ReduceMotion.System`,
 * so it jumps to its end when the OS asks for reduced motion.
 */
export function SwipeToRemove({ children, onRemove, name }: SwipeToRemoveProps) {
  const { t } = useTranslation();

  return (
    <ReanimatedSwipeable
      testID="swipe-to-remove"
      // A short pull opens it, but not by accident while the list scrolls (the list scrolls
      // vertically; the pan only starts after a horizontal move).
      rightThreshold={72}
      overshootRight={false}
      friction={2}
      // There is only one panel (the right one), so whichever way the library names the direction,
      // an open row means "remove".
      onSwipeableOpen={onRemove}
      renderRightActions={() => (
        <Pressable
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          onPress={onRemove}
          style={styles.action}
          testID={`swipe-remove-${name}`}
        >
          <Text variant="label" tone="onPrimary">
            {t('cart.line.remove')}
          </Text>
        </Pressable>
      )}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create((theme) => ({
  action: {
    width: 96,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.danger,
  },
}));
