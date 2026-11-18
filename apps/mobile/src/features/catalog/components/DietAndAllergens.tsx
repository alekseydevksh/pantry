import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Text } from '@/design-system';
import { useTranslation } from '@/lib/i18n';

import { joinLabels } from '../model/details';

type Diet = 'VEGETARIAN' | 'VEGAN' | 'GLUTEN_FREE' | 'DAIRY_FREE';
type Allergen =
  'GLUTEN' | 'DAIRY' | 'EGGS' | 'NUTS' | 'PEANUTS' | 'SOY' | 'FISH' | 'SHELLFISH' | 'SESAME';

export type DietAndAllergensProps = {
  diets: readonly Diet[];
  allergens: readonly Allergen[];
};

/**
 * The diets an item suits and the allergens it contains, as text. Allergens are always shown, also
 * when there are none, so a shopper who avoids one never has to guess whether the list is missing.
 */
export function DietAndAllergens({ diets, allergens }: DietAndAllergensProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      {diets.length > 0 && (
        <Text variant="callout" tone="muted">
          {t('catalog.suitableFor', {
            list: joinLabels(diets, (diet) => t(`catalog.diet.${diet as Diet}`)),
          })}
        </Text>
      )}
      <Text variant="callout" tone={allergens.length > 0 ? 'default' : 'muted'}>
        {allergens.length > 0
          ? t('catalog.contains', {
              list: joinLabels(allergens, (allergen) =>
                t(`catalog.allergen.${allergen as Allergen}`),
              ),
            })
          : t('catalog.noAllergens')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: { gap: theme.spacing.xs },
}));
