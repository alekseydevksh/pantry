// Reanimated in Jest. The library is native code and its own mock still runs the native
// initializer, which throws here. Tests only need to know that a component renders and which
// style props it passes, so this mock covers what the app uses: `Animated.View` is a plain
// `View` (CSS animation props stay in `style`, where a test can read them), and
// `useReducedMotion` can be switched with `setTestReducedMotion`.
// Add more members here when a new Reanimated API is used.
import { View } from 'react-native';

let reducedMotion = false;

export function setTestReducedMotion(value: boolean) {
  reducedMotion = value;
}

export function resetTestReducedMotion() {
  reducedMotion = false;
}

export const reanimatedMock = {
  __esModule: true,
  default: { View },
  useReducedMotion: () => reducedMotion,
};
