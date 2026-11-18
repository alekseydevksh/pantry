import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Text } from '@/design-system';
import { useTranslation } from '@/lib/i18n';

// Placeholder screen, replaced by the real feature later.
export function CartScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.screen}>
      <Text variant="title" accessibilityRole="header">
        {t('cart.title')}
      </Text>
      <Text tone="muted">{t('cart.empty')}</Text>
      <Text tone="muted">{t('cart.itemCount', { count: 0 })}</Text>
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
