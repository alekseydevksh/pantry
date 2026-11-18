import { useFragment } from '@apollo/client/react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { ProductDetailsFieldsFragmentDoc } from '@pantry/shared';

import { Text } from '@/design-system';

import { DietAndAllergens } from './DietAndAllergens';

/** Description, diets and allergens. */
export function ProductDetails({ id }: { id: string }) {
  const { data, complete } = useFragment({
    fragment: ProductDetailsFieldsFragmentDoc,
    from: { __typename: 'Product', id },
  });
  if (!complete) return null;

  return (
    <View style={styles.container}>
      <Text>{data.description}</Text>
      <DietAndAllergens diets={data.diets} allergens={data.allergens} />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: { gap: theme.spacing.md },
}));
