import { useFragment } from '@apollo/client/react';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { IngredientProductFieldsFragmentDoc } from '@pantry/shared';

import { Text } from '@/design-system';
import { currentLanguage, formatPrice, useTranslation } from '@/lib/i18n';

export type IngredientRowProps = {
  /** What the recipe needs, as text: "200 g". Not the same as the pack size of the product. */
  quantity: string;
  /** The product to buy. The recipe query only selects its id; the row reads the rest. */
  product: { id: string };
};

/** One ingredient. The product is a real catalog item, so the row opens its screen. */
export function IngredientRow({ quantity, product }: IngredientRowProps) {
  const { t } = useTranslation();
  const { data, complete } = useFragment({
    fragment: IngredientProductFieldsFragmentDoc,
    from: { __typename: 'Product', id: product.id },
  });
  if (!complete) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('recipe.ingredientLabel', { quantity, name: data.name })}
      onPress={() => router.push({ pathname: '/product/[id]', params: { id: data.id } })}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.text}>
        <Text variant="body">{`${quantity} ${data.name}`}</Text>
        <Text variant="callout" tone={data.inStock ? 'muted' : 'danger'}>
          {data.inStock
            ? `${data.unit} · ${formatPrice(data.priceCents, currentLanguage())}`
            : t('feed.outOfStock')}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: {
    minHeight: theme.sizes.minTouchTarget,
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  pressed: { backgroundColor: theme.colors.surfaceRaised },
  text: { gap: theme.spacing.xxs },
}));
