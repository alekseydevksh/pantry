import { Screen, Text } from '@/design-system';
import { useTranslation } from '@/lib/i18n';
import { FeatureErrorBoundary } from '@/lib/error-boundary';

// Placeholder screen, replaced by the real feature later.
export function CartScreen() {
  return (
    <FeatureErrorBoundary feature="cart">
      <CartContent />
    </FeatureErrorBoundary>
  );
}

function CartContent() {
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
