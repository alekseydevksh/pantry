import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Button, Chip, Text } from '@/design-system';
import { useTranslation } from '@/lib/i18n';

import type { SearchInput } from '@pantry/shared';

import { emptyReason, SUGGESTED_QUERIES } from '../model/emptyState';

export type SearchEmptyStateProps = {
  /** The search that found nothing, or `null` when nothing has been searched yet. */
  input: SearchInput | null;
  onSearch: (query: string) => void;
  onClearFilters: () => void;
};

/** Nothing searched yet, or nothing found: says which, why, and offers searches to try. */
export function SearchEmptyState({ input, onSearch, onClearFilters }: SearchEmptyStateProps) {
  const { t } = useTranslation();
  const reason = input ? emptyReason(input) : null;

  return (
    <View style={styles.container}>
      <View accessible accessibilityRole="summary" style={styles.message}>
        <Text variant="title" accessibilityRole="header">
          {input === null
            ? t('search.empty.idleTitle')
            : input.query
              ? t('search.empty.title', { query: input.query })
              : t('search.empty.titleNoQuery')}
        </Text>
        <Text tone="muted">
          {reason === null ? t('search.empty.idleMessage') : t(`search.empty.reason.${reason}`)}
        </Text>
      </View>
      {reason === 'filters' || reason === 'productsHaveNoTime' ? (
        <Button
          variant="secondary"
          title={t('search.empty.clearFilters')}
          onPress={onClearFilters}
        />
      ) : null}
      <View style={styles.suggestions}>
        <Text variant="caption" tone="muted" accessibilityRole="header">
          {t('search.empty.try')}
        </Text>
        <View style={styles.chips}>
          {SUGGESTED_QUERIES.map((query) => (
            <Chip
              key={query}
              label={query}
              accessibilityLabel={t('search.empty.searchFor', { query })}
              onPress={() => onSearch(query)}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: { padding: theme.spacing.lg, gap: theme.spacing.lg },
  message: { gap: theme.spacing.sm },
  suggestions: { gap: theme.spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
}));
