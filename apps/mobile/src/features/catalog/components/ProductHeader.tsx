import { useFragment } from '@apollo/client/react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { ProductHeaderFieldsFragmentDoc } from '@pantry/shared';

import { Text } from '@/design-system';
import { currentLanguage, formatPrice, useTranslation } from '@/lib/i18n';

import { CatalogImage } from './CatalogImage';
import { HeaderSkeleton } from './DetailsSkeleton';

/**
 * Photo, name, pack size, price and stock. These are the fields of the feed card, so a product
 * opened from the feed is complete in the cache and this renders at once.
 */
export function ProductHeader({ id }: { id: string }) {
  const { t } = useTranslation();
  const { data, complete } = useFragment({
    fragment: ProductHeaderFieldsFragmentDoc,
    from: { __typename: 'Product', id },
  });
  if (!complete) return <HeaderSkeleton />;

  return (
    <View>
      <CatalogImage uri={data.imageUrl} recyclingKey={data.id} size="hero" />
      <View style={styles.text}>
        <Text variant="title" accessibilityRole="header">
          {data.name}
        </Text>
        <Text tone="muted">{data.unit}</Text>
        <Text variant="headline">{formatPrice(data.priceCents, currentLanguage())}</Text>
        <Text variant="callout" tone={data.inStock ? 'muted' : 'danger'}>
          {data.inStock ? t('product.inStock') : t('feed.outOfStock')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  text: { padding: theme.spacing.lg, gap: theme.spacing.xs },
}));
