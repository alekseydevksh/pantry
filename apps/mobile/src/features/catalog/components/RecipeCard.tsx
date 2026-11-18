import { useFragment } from '@apollo/client/react';
import { router } from 'expo-router';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { RecipeCardFieldsFragmentDoc } from '@pantry/shared';

import { Card, Text } from '@/design-system';
import { useTranslation } from '@/lib/i18n';

import type { RecipeNode } from '../model/feed';
import { CatalogImage } from './CatalogImage';

export type RecipeCardProps = {
  /** The feed row. It holds only the type and the id; the card reads the rest from the cache. */
  item: RecipeNode;
};

export function RecipeCard({ item }: RecipeCardProps) {
  const { t } = useTranslation();
  const { data, complete } = useFragment({ fragment: RecipeCardFieldsFragmentDoc, from: item });
  if (!complete) return null;

  return (
    <Card
      style={styles.card}
      accessibilityLabel={t('feed.recipeLabel', { name: data.name, minutes: data.cookTimeMin })}
      onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: data.id } })}
    >
      <CatalogImage uri={data.imageUrl} recyclingKey={data.id} size="card" />
      <View style={styles.body}>
        <Text variant="caption" tone="primary">
          {t('feed.kind.recipe')}
        </Text>
        <Text variant="headline" numberOfLines={2}>
          {data.name}
        </Text>
        <Text variant="callout" tone="muted">
          {`${t('feed.cookTime', { minutes: data.cookTimeMin })} · ${t('feed.servings', { count: data.servings })}`}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: { padding: 0, overflow: 'hidden', gap: 0 },
  body: { padding: theme.spacing.lg, gap: theme.spacing.xs },
}));
