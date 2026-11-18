import { type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { useUnistyles } from 'react-native-unistyles';

export type SkeletonProps = {
  testID?: string;
  width?: DimensionValue;
  height?: DimensionValue;
  /** Default: the medium radius. Use `theme.radius.pill` for avatars. */
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

const pulse = {
  animationName: { from: { opacity: 1 }, to: { opacity: 0.4 } },
  animationDuration: '900ms',
  animationIterationCount: 'infinite',
  animationDirection: 'alternate',
  animationTimingFunction: 'ease-in-out',
} as const;

/**
 * A pulsing placeholder for content that is loading. It is hidden from screen readers:
 * the screen that uses it announces the loading state itself.
 */
export function Skeleton({ width = '100%', height = 16, radius, style, testID }: SkeletonProps) {
  // The color is a style that Reanimated owns, so the theme comes from the hook and the
  // component re-renders on a theme change.
  const { theme } = useUnistyles();
  const reduceMotion = useReducedMotion();

  return (
    <Animated.View
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height,
          borderRadius: radius ?? theme.radius.md,
          backgroundColor: theme.colors.surfaceRaised,
        },
        !reduceMotion && pulse,
        style,
      ]}
    />
  );
}
