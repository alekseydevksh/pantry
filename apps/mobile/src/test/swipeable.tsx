// `ReanimatedSwipeable` in Jest. The real one runs on Reanimated worklets and Gesture Handler's
// native pan, neither of which Jest has, so a test cannot swipe. This stand-in renders the row and
// its right-hand panel, and adds a button, `<testID>-open`, that does what a finished swipe does:
// it calls `onSwipeableOpen`. That checks what the app does with a swipe; that the swipe itself
// works is checked by hand on a device (PLAN 3.11).
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

type Props = {
  testID?: string;
  children?: ReactNode;
  onSwipeableOpen?: (direction: 'left' | 'right') => void;
  renderRightActions?: (progress: { value: number }, translation: { value: number }) => ReactNode;
};

export function swipeableMock() {
  function Swipeable({ testID, children, onSwipeableOpen, renderRightActions }: Props) {
    return (
      <View testID={testID}>
        {children}
        {renderRightActions?.({ value: 1 }, { value: -96 })}
        <Pressable
          accessible={false}
          testID={`${testID}-open`}
          onPress={() => onSwipeableOpen?.('right')}
        />
      </View>
    );
  }
  return { __esModule: true, default: Swipeable, SwipeDirection: { LEFT: 'left', RIGHT: 'right' } };
}
