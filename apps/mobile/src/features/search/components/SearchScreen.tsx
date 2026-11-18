import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Text } from '@/design-system';

// Placeholder until Phase 3. English strings are temporary: i18n arrives in task 1.6.
export function SearchScreen() {
  return (
    <View style={styles.screen}>
      <Text variant="title" accessibilityRole="header">
        Search
      </Text>
      <Text tone="muted">Search for groceries and recipes here.</Text>
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
