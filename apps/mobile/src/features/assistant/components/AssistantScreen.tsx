import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Button, Text } from '@/design-system';

export type AssistantScreenProps = {
  /** Called when the user closes the assistant. The route decides where that goes. */
  onClose: () => void;
};

// Placeholder until Phase 4. English strings are temporary: i18n arrives in task 1.6.
export function AssistantScreen({ onClose }: AssistantScreenProps) {
  return (
    <View style={styles.screen}>
      <Text variant="title" accessibilityRole="header">
        Assistant
      </Text>
      <Text tone="muted">Ask for recipes, products and meal ideas.</Text>
      <Button title="Close" variant="secondary" onPress={onClose} />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
}));
