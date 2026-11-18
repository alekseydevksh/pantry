import type { ExpoConfig } from 'expo/config';

// Native configuration lives here. `ios/` and `android/` are generated from it by `expo prebuild`
// (Continuous Native Generation) and are not committed.
const BRAND_GREEN = '#2F7D4F';

const config: ExpoConfig = {
  name: 'Pantry',
  slug: 'pantry',
  version: '0.1.0',
  orientation: 'portrait',
  platforms: ['ios', 'android'],
  // Deep links: pantry://recipe/:id
  scheme: 'pantry',
  userInterfaceStyle: 'automatic',
  icon: './assets/images/icon.png',
  ios: {
    bundleIdentifier: 'dev.pantry.app',
    supportsTablet: false,
  },
  android: {
    package: 'dev.pantry.app',
    adaptiveIcon: {
      backgroundColor: BRAND_GREEN,
      foregroundImage: './assets/images/android-icon-foreground.png',
    },
  },
  plugins: [
    'expo-router',
    'expo-image',
    [
      'expo-splash-screen',
      {
        backgroundColor: BRAND_GREEN,
        image: './assets/images/splash-icon.png',
        imageWidth: 96,
      },
    ],
    'expo-status-bar',
  ],
  experiments: {
    typedRoutes: true,
    // React Compiler memoizes components at build time: no manual useMemo/useCallback/React.memo.
    reactCompiler: true,
  },
};

export default config;
