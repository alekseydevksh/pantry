import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Text } from '@/design-system';
import { useTranslation } from '@/lib/i18n';

export type RecipeScreenProps = {
  /** The recipe id from the route, for example `r1`. */
  id: string;
};

// Placeholder screen, replaced by the real feature in Phase 2.
export function RecipeScreen({ id }: RecipeScreenProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.screen}>
      <Text variant="title" accessibilityRole="header">
        {t('screens.recipe')}
      </Text>
      <Text tone="muted">{t('details.recipe', { id })}</Text>
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
