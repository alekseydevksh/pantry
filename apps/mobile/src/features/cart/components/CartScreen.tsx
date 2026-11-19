import { FlashList } from '@shopify/flash-list';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { ErrorState, Screen, Text } from '@/design-system';
import { CardListSkeleton } from '@/features/catalog';
import { FeatureErrorBoundary } from '@/lib/error-boundary';
import { currentLanguage, formatPrice, useTranslation } from '@/lib/i18n';
import { OfflineBanner } from '@/lib/network';

import { useCart } from '../hooks/useCart';
import { useCartActions } from '../hooks/useCartActions';
import { CartLineRow } from './CartLineRow';

export function CartScreen() {
  return (
    <FeatureErrorBoundary feature="cart">
      <CartContent />
    </FeatureErrorBoundary>
  );
}

function CartContent() {
  const { t } = useTranslation();
  const cart = useCart();
  const { setQty, remove } = useCartActions();

  return (
    <Screen bottomInset={false} style={styles.screen}>
      <OfflineBanner />
      <View style={styles.header}>
        <Text variant="title" accessibilityRole="header">
          {t('cart.title')}
        </Text>
        {cart.status === 'ready' && cart.refreshFailed ? (
          <Text tone="danger" accessibilityRole="alert">
            {t('cart.refreshFailed')}
          </Text>
        ) : null}
      </View>
      {cart.status === 'loading' ? (
        <View style={styles.padded}>
          <CardListSkeleton label={t('cart.loading')} />
        </View>
      ) : cart.status === 'error' ? (
        <View style={styles.padded}>
          <ErrorState
            title={t('cart.error.title')}
            message={t('cart.error.message')}
            retryLabel={t('common.retry')}
            onRetry={cart.retry}
          />
        </View>
      ) : cart.lines.length === 0 ? (
        <View style={styles.padded}>
          <Text tone="muted">{t('cart.empty')}</Text>
        </View>
      ) : (
        <FlashList
          testID="cart-list"
          data={cart.lines}
          keyExtractor={(line) => line.productId}
          renderItem={({ item }) => <CartLineRow line={item} onSetQty={setQty} onRemove={remove} />}
          ItemSeparatorComponent={Separator}
          ListFooterComponent={<Summary {...cart} />}
          onRefresh={cart.refresh}
          refreshing={false}
          contentContainerStyle={styles.listContent}
        />
      )}
    </Screen>
  );
}

function Summary({
  itemCount,
  totalCents,
  pending,
}: {
  itemCount: number;
  totalCents: number;
  pending: number;
}) {
  const { t } = useTranslation();

  return (
    <View style={styles.summary}>
      <Text tone="muted" accessibilityLiveRegion="polite">
        {t('cart.itemCount', { count: itemCount })}
      </Text>
      <Text variant="headline" accessibilityLiveRegion="polite">
        {t('cart.total', { price: formatPrice(totalCents, currentLanguage()) })}
      </Text>
      {pending > 0 ? (
        <Text variant="callout" tone="muted" accessibilityLiveRegion="polite">
          {t('cart.pending', { count: pending })}
        </Text>
      ) : null}
    </View>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create((theme) => ({
  // The list scrolls edge to edge; the rows keep their own padding.
  screen: { padding: theme.spacing.none, gap: theme.spacing.none },
  padded: { padding: theme.spacing.lg, gap: theme.spacing.sm },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  listContent: { padding: theme.spacing.lg },
  separator: { height: theme.spacing.md },
  summary: { paddingTop: theme.spacing.xl, gap: theme.spacing.xs },
}));
