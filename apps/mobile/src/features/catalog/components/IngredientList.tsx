import { useFragment } from '@apollo/client/react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { RecipeIngredientsFieldsFragmentDoc } from '@pantry/shared';

import { Text } from '@/design-system';
import { useTranslation } from '@/lib/i18n';

import { IngredientRow } from './IngredientRow';

/** The ingredients of a recipe. Each one is a product of the catalog. */
export function IngredientList({ id }: { id: string }) {
  const { t } = useTranslation();
  const { data, complete } = useFragment({
    fragment: RecipeIngredientsFieldsFragmentDoc,
    // The document also holds the fragment of the product row that this one spreads, so the name
    // says which of the two to read.
    fragmentName: 'RecipeIngredientsFields',
    from: { __typename: 'Recipe', id },
  });
  if (!complete) return null;

  return (
    <View>
      <Text variant="headline" accessibilityRole="header" style={styles.heading}>
        {t('recipe.ingredients')}
      </Text>
      {data.ingredients.map((ingredient) => (
        <IngredientRow
          key={ingredient.product.id}
          quantity={ingredient.quantity}
          product={ingredient.product}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  heading: { marginBottom: theme.spacing.xs },
}));
