import { useFragment } from '@apollo/client/react';
import { useState } from 'react';
import { View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
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
  const reduceMotion = useReducedMotion();
  // Each press restarts the animation: a new `key` is a new view, which plays it from the start.
  const [presses, setPresses] = useState(0);

  return (
    <View style={styles.container}>
      <Animated.View
        testID="add-to-cart-pulse"
        key={presses}
        style={presses > 0 && !reduceMotion ? styles.added : undefined}
      >
        <Button
          title={outOfStock ? t('feed.outOfStock') : t('product.addToCart')}
          disabled={outOfStock}
          onPress={() => {
            add(id);
            setPresses((count) => count + 1);
          }}
        />
      </Animated.View>
      {inCart > 0 ? (
        <Text variant="callout" tone="muted" accessibilityLiveRegion="polite">
          {t('product.inCart', { count: inCart })}
        </Text>
      ) : null}
    </View>
  );
}

// A short "pop" when something was added. A Reanimated CSS animation: it runs on the UI thread, with
// no shared values. Left out when the user asked for reduced motion; the count below still changes.
const ADDED_ANIMATION = {
  animationName: {
    '0%': { transform: [{ scale: 1 }] },
    '40%': { transform: [{ scale: 1.06 }] },
    '100%': { transform: [{ scale: 1 }] },
  },
  animationDuration: '280ms',
  animationTimingFunction: 'ease-out',
} as const;

const styles = StyleSheet.create((theme) => ({
  container: { gap: theme.spacing.sm },
  added: ADDED_ANIMATION,
}));
