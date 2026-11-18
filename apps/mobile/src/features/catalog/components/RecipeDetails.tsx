import { useFragment } from '@apollo/client/react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { RecipeDetailsFieldsFragmentDoc } from '@pantry/shared';

import { Text } from '@/design-system';
import { currentLanguage, formatPrice, useTranslation } from '@/lib/i18n';

import { DietAndAllergens } from './DietAndAllergens';

/** Description, diets, allergens and price. The ingredients and the steps come after it. */
export function RecipeDetails({ id }: { id: string }) {
  const { t } = useTranslation();
  const { data, complete } = useFragment({
    fragment: RecipeDetailsFieldsFragmentDoc,
    from: { __typename: 'Recipe', id },
  });
  if (!complete) return null;

  return (
    <View style={styles.container}>
      <Text>{data.description}</Text>
      <DietAndAllergens diets={data.diets} allergens={data.allergens} />
      <Text variant="callout" tone="muted">
        {t('recipe.totalPrice', { price: formatPrice(data.priceCents, currentLanguage()) })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: { gap: theme.spacing.md },
}));
