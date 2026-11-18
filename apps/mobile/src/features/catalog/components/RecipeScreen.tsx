import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Text } from '@/design-system';

export type RecipeScreenProps = {
  /** The recipe id from the route, for example `r1`. */
  id: string;
};

// Placeholder until task 2.6. English strings are temporary: i18n arrives in task 1.6.
export function RecipeScreen({ id }: RecipeScreenProps) {
  return (
    <View style={styles.screen}>
      <Text variant="title" accessibilityRole="header">
        Recipe
      </Text>
      <Text tone="muted">{`Details for recipe ${id}`}</Text>
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
