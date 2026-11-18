// App entry. Unistyles must know the themes before any screen module creates a StyleSheet,
// and i18next must be ready before the first render, so both are imported before Expo Router
// loads the routes.
import './src/design-system/unistyles';
import './src/lib/i18n';
import 'expo-router/entry';
