import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Text } from '@/design-system';
import { useTranslation } from '@/lib/i18n';

export type ProductScreenProps = {
  /** The product id from the route, for example `r1`. */
  id: string;
};

// Placeholder screen, replaced by the real feature in Phase 2.
export function ProductScreen({ id }: ProductScreenProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.screen}>
      <Text variant="title" accessibilityRole="header">
        {t('screens.product')}
      </Text>
      <Text tone="muted">{t('details.product', { id })}</Text>
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
