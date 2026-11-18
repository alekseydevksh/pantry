import { useFragment } from '@apollo/client/react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { RecipeDetailsFieldsFragmentDoc } from '@pantry/shared';

import { Text } from '@/design-system';
import { currentLanguage, formatPrice, useTranslation } from '@/lib/i18n';

import { DietAndAllergens } from './DietAndAllergens';

/** Description, diets, allergens, price and the steps of the method. */
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

      <Text variant="headline" accessibilityRole="header" style={styles.heading}>
        {t('recipe.steps')}
      </Text>
      {data.steps.map((step, index) => (
        <View key={index} style={styles.step} accessible>
          <Text variant="label" tone="primary">
            {t('recipe.step', { number: index + 1 })}
          </Text>
          <Text>{step}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: { gap: theme.spacing.md },
  heading: { marginTop: theme.spacing.md },
  step: { gap: theme.spacing.xxs },
}));
