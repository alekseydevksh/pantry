import { Screen, Text } from '@/design-system';
import { useTranslation } from '@/lib/i18n';

// Placeholder screen, replaced by the real feature later.
export function CartScreen() {
  const { t } = useTranslation();

  return (
    <Screen bottomInset={false}>
      <Text variant="title" accessibilityRole="header">
        {t('cart.title')}
      </Text>
      <Text tone="muted">{t('cart.empty')}</Text>
      <Text tone="muted">{t('cart.itemCount', { count: 0 })}</Text>
    </Screen>
  );
}
