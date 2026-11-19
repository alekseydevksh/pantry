import { useFragment } from '@apollo/client/react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { ProductHeaderFieldsFragmentDoc } from '@pantry/shared';

import { Button, IconButton, Text } from '@/design-system';
import { CatalogImage } from '@/features/catalog';
import { currentLanguage, formatPrice, useTranslation } from '@/lib/i18n';

import { MAX_QTY, type CartLine } from '../model/cart';
import { SwipeToRemove } from './SwipeToRemove';

export type CartLineRowProps = {
  line: CartLine;
  onSetQty: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
};

/**
 * One line of the cart. The row holds the product id and the quantity; the name, photo and price
 * come from the product fragment in the cache (ADR 0007).
 */
export function CartLineRow({ line, onSetQty, onRemove }: CartLineRowProps) {
  const { t } = useTranslation();
  const { data, complete } = useFragment({
    fragment: ProductHeaderFieldsFragmentDoc,
    from: { __typename: 'Product', id: line.productId },
  });
  if (!complete) return null;

  const language = currentLanguage();
  const unitPrice = formatPrice(data.priceCents, language);
  const lineTotal = formatPrice(data.priceCents * line.qty, language);

  return (
    <SwipeToRemove name={data.name} onRemove={() => onRemove(line.productId)}>
      <View style={styles.row}>
        <View style={styles.image}>
          <CatalogImage uri={data.imageUrl} recyclingKey={data.id} size="thumb" />
        </View>
        <View style={styles.body}>
          <Text variant="headline" numberOfLines={2}>
            {data.name}
          </Text>
          <Text variant="callout" tone="muted">
            {`${data.unit} · ${unitPrice}`}
          </Text>
          <View style={styles.controls}>
            <IconButton
              accessibilityLabel={t('cart.line.decrease', { name: data.name })}
              onPress={() => onSetQty(line.productId, line.qty - 1)}
            >
              <Text variant="title">−</Text>
            </IconButton>
            <Text
              variant="headline"
              accessibilityLabel={t('cart.line.quantity', { count: line.qty })}
              accessibilityLiveRegion="polite"
            >
              {String(line.qty)}
            </Text>
            <IconButton
              accessibilityLabel={t('cart.line.increase', { name: data.name })}
              disabled={line.qty >= MAX_QTY}
              onPress={() => onSetQty(line.productId, line.qty + 1)}
            >
              <Text variant="title">+</Text>
            </IconButton>
            <Text variant="headline" style={styles.total}>
              {lineTotal}
            </Text>
          </View>
          <Button
            variant="ghost"
            title={t('cart.line.remove')}
            accessibilityLabel={t('cart.line.removeLabel', { name: data.name })}
            onPress={() => onRemove(line.productId)}
          />
        </View>
      </View>
    </SwipeToRemove>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
  },
  image: { borderRadius: theme.radius.md, overflow: 'hidden', alignSelf: 'flex-start' },
  body: { flex: 1, gap: theme.spacing.xs },
  controls: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  total: { marginLeft: 'auto' },
}));
