import { useFragment } from '@apollo/client/react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { RecipeStepsFieldsFragmentDoc } from '@pantry/shared';

import { Text } from '@/design-system';
import { useTranslation } from '@/lib/i18n';

/** The method, one numbered step after the other. */
export function RecipeSteps({ id }: { id: string }) {
  const { t } = useTranslation();
  const { data, complete } = useFragment({
    fragment: RecipeStepsFieldsFragmentDoc,
    from: { __typename: 'Recipe', id },
  });
  if (!complete) return null;

  return (
    <View style={styles.container}>
      <Text variant="headline" accessibilityRole="header">
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
  step: { gap: theme.spacing.xxs },
}));
