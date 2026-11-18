import { useFragment } from '@apollo/client/react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { RecipeHeaderFieldsFragmentDoc } from '@pantry/shared';

import { Text } from '@/design-system';
import { useTranslation } from '@/lib/i18n';

import { CatalogImage } from './CatalogImage';
import { HeaderSkeleton } from './DetailsSkeleton';

/**
 * Photo, name, cook time and servings. These are the fields of the feed card, so a recipe opened
 * from the feed is complete in the cache and this renders at once. After a deep link it is not,
 * and the placeholder shows until the query arrives.
 */
export function RecipeHeader({ id }: { id: string }) {
  const { t } = useTranslation();
  const { data, complete } = useFragment({
    fragment: RecipeHeaderFieldsFragmentDoc,
    from: { __typename: 'Recipe', id },
  });
  if (!complete) return <HeaderSkeleton />;

  return (
    <View>
      <CatalogImage uri={data.imageUrl} recyclingKey={data.id} size="hero" />
      <View style={styles.text}>
        <Text variant="title" accessibilityRole="header">
          {data.name}
        </Text>
        <Text tone="muted">
          {`${t('feed.cookTime', { minutes: data.cookTimeMin })} · ${t('feed.servings', { count: data.servings })}`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  text: { padding: theme.spacing.lg, gap: theme.spacing.xs },
}));
