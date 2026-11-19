import { useFragment } from '@apollo/client/react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { ProductHeaderFieldsFragmentDoc } from '@pantry/shared';

import { Button, Text } from '@/design-system';
import { useTranslation } from '@/lib/i18n';

import { useCartActions, useCartQuantity } from '../hooks/useCartActions';

/**
 * The add-to-cart button of a product. It adds one and shows how many are in the cart, which counts
 * the changes that have not reached the server yet. An out-of-stock product has nothing to add, so
 * the button says that instead.
 */
export function AddToCartButton({ id }: { id: string }) {
  const { t } = useTranslation();
  const { data, complete } = useFragment({
    fragment: ProductHeaderFieldsFragmentDoc,
    from: { __typename: 'Product', id },
  });
  const { add } = useCartActions();
  const inCart = useCartQuantity(id);
  const outOfStock = complete && !data.inStock;

  return (
    <View style={styles.container}>
      <Button
        title={outOfStock ? t('feed.outOfStock') : t('product.addToCart')}
        disabled={outOfStock}
        onPress={() => add(id)}
      />
      {inCart > 0 ? (
        <Text variant="callout" tone="muted" accessibilityLiveRegion="polite">
          {t('product.inCart', { count: inCart })}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: { gap: theme.spacing.sm },
}));
