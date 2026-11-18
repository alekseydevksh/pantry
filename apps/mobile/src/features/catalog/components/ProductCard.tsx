import { useFragment } from '@apollo/client/react';
import { router } from 'expo-router';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { ProductCardFieldsFragmentDoc } from '@pantry/shared';

import { Card, Text } from '@/design-system';
import { currentLanguage, formatPrice, useTranslation } from '@/lib/i18n';

import type { ProductNode } from '../model/feed';
import { CatalogImage } from './CatalogImage';

export type ProductCardProps = {
  /** The feed row. It holds only the type and the id; the card reads the rest from the cache. */
  item: ProductNode;
};

export function ProductCard({ item }: ProductCardProps) {
  const { t } = useTranslation();
  // ADR 0007: the feed query only spreads the fragment. This component reads its own fields, and
  // re-renders only when this product changes in the cache.
  const { data, complete } = useFragment({ fragment: ProductCardFieldsFragmentDoc, from: item });
  if (!complete) return null;

  const price = formatPrice(data.priceCents, currentLanguage());

  return (
    <Card
      style={styles.card}
      accessibilityLabel={t('feed.productLabel', { name: data.name, unit: data.unit, price })}
      onPress={() => router.push({ pathname: '/product/[id]', params: { id: data.id } })}
    >
      <CatalogImage uri={data.imageUrl} recyclingKey={data.id} size="card" />
      <View style={styles.body}>
        <Text variant="caption" tone="muted">
          {t('feed.kind.product')}
        </Text>
        <Text variant="headline" numberOfLines={2}>
          {data.name}
        </Text>
        <Text variant="callout" tone="muted">
          {`${data.unit} · ${price}`}
        </Text>
        {data.inStock ? null : (
          <Text variant="callout" tone="danger">
            {t('feed.outOfStock')}
          </Text>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create((theme) => ({
  // The photo runs to the edges of the card, so the card has no padding of its own.
  card: { padding: 0, overflow: 'hidden', gap: 0 },
  body: { padding: theme.spacing.lg, gap: theme.spacing.xs },
}));
