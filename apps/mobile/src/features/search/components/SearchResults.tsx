import { FlashList } from '@shopify/flash-list';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { track } from '@/analytics';
import { ErrorState, Text } from '@/design-system';
import { useFlag } from '@/flags';
import { useTranslation } from '@/lib/i18n';
import { CardListSkeleton, CatalogCard } from '@/features/catalog';

import type { SearchInput } from '@pantry/shared';

import type { SearchResultsState } from '../hooks/useSearchResults';
import { END_REACHED_THRESHOLD, LAYOUT_COLUMNS, resultType } from '../model/results';
import { searchResultClicked } from '../model/searchEvents';
import { SearchEmptyState } from './SearchEmptyState';

type Ready = Extract<SearchResultsState, { status: 'ready' }>;

export type SearchResultsProps = {
  results: SearchResultsState;
  /** The search the results are for. */
  input: SearchInput;
  /** A suggested query from an empty state was tapped. */
  onSearch: (query: string) => void;
  onClearFilters: () => void;
};

/**
 * The results of the search on the route: a prompt when nothing is searched yet, placeholders, the
 * list, "no results" with a way on, or an inline error with a retry.
 */
export function SearchResults({ results, input, onSearch, onClearFilters }: SearchResultsProps) {
  const { t } = useTranslation();

  switch (results.status) {
    case 'idle':
      return <SearchEmptyState input={null} onSearch={onSearch} onClearFilters={onClearFilters} />;
    case 'loading':
      return (
        <View style={styles.padded}>
          <CardListSkeleton label={t('search.results.loading')} />
        </View>
      );
    case 'error':
      return (
        <View style={styles.padded}>
          <ErrorState
            title={t('search.error.title')}
            message={t('search.error.message')}
            retryLabel={t('common.retry')}
            onRetry={results.retry}
          />
        </View>
      );
    case 'ready':
      return results.rows.length === 0 ? (
        <SearchEmptyState input={input} onSearch={onSearch} onClearFilters={onClearFilters} />
      ) : (
        <ResultList results={results} input={input} />
      );
  }
}

function ResultList({ results, input }: { results: Ready; input: SearchInput }) {
  const { t } = useTranslation();
  // The list is only mounted once there are results to show, so this is where the user first sees
  // the layout. The exposure is logged here and not on the screen, which mounts earlier (ADR 0012).
  const { variant, expose } = useFlag('search_layout', { expose: 'manual' });
  useEffect(() => {
    expose();
  }, [expose]);
  const grid = variant === 'grid';

  return (
    <FlashList
      // A new key rebuilds the list when the layout changes (an override in the debug panel).
      key={variant}
      testID="search-list"
      data={results.rows}
      keyExtractor={(row) => row.key}
      getItemType={resultType}
      numColumns={LAYOUT_COLUMNS[variant]}
      renderItem={({ item, index }) => (
        <View
          testID={grid ? 'search-grid-cell' : undefined}
          style={grid ? styles.gridCell : undefined}
        >
          <CatalogCard
            node={item.node}
            onPress={() => track('search_result_clicked', searchResultClicked(input, item, index))}
          />
        </View>
      )}
      ItemSeparatorComponent={grid ? undefined : Separator}
      ListHeaderComponent={
        <View
          accessible
          accessibilityRole="header"
          accessibilityLiveRegion="polite"
          style={styles.count}
        >
          <Text tone="muted">{t('search.results.count', { count: results.totalCount })}</Text>
          {results.refreshFailed ? (
            <Text tone="danger" accessibilityRole="alert">
              {t('feed.refreshFailed')}
            </Text>
          ) : null}
        </View>
      }
      ListFooterComponent={<ResultFooter results={results} />}
      onEndReached={results.loadMore}
      onEndReachedThreshold={END_REACHED_THRESHOLD}
      refreshing={results.refreshing}
      onRefresh={results.refresh}
      // The rows of the previous search stay, dimmed, until the new first page arrives.
      style={results.stale ? styles.stale : undefined}
      contentContainerStyle={styles.listContent}
    />
  );
}

function ResultFooter({ results }: { results: Ready }) {
  const { t } = useTranslation();

  if (results.loadMoreFailed) {
    return (
      <ErrorState
        title={t('feed.loadMoreFailed')}
        retryLabel={t('common.retry')}
        onRetry={results.retryLoadMore}
      />
    );
  }
  if (results.loadingMore) {
    return (
      <View style={styles.footer} accessible accessibilityLabel={t('feed.loadingMore')}>
        <ActivityIndicator />
      </View>
    );
  }
  if (!results.hasNextPage && results.rows.length > 0) {
    return (
      <Text tone="muted" style={styles.footer}>
        {t('search.results.end')}
      </Text>
    );
  }
  return null;
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create((theme) => ({
  padded: { paddingHorizontal: theme.spacing.lg },
  listContent: { padding: theme.spacing.lg },
  // Grid cells carry the gap themselves: half of it on each side, so two columns are one gap apart.
  gridCell: { padding: theme.spacing.xs },
  count: { marginBottom: theme.spacing.md, gap: theme.spacing.xs },
  separator: { height: theme.spacing.md },
  footer: { padding: theme.spacing.xl, textAlign: 'center' },
  stale: { opacity: 0.5 },
}));
