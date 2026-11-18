import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Text } from '@/design-system';

// Placeholder until task 1.7. English strings are temporary: i18n arrives in task 1.6.
export function SettingsScreen() {
  return (
    <View style={styles.screen}>
      <Text variant="title" accessibilityRole="header">
        Settings
      </Text>
      <Text tone="muted">Language, theme and AI mode.</Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    padding: theme.spacing.xl,
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
}));
