// App entry. Unistyles must know the themes before any screen module creates a StyleSheet,
// so the configuration is imported before Expo Router loads the routes.
import './src/design-system/unistyles';
import 'expo-router/entry';
