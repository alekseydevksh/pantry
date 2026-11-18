import { FlashList } from '@shopify/flash-list';
import { ActivityIndicator, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { ErrorState, Text } from '@/design-system';
import { useTranslation } from '@/lib/i18n';
import { CardListSkeleton, CatalogCard } from '@/features/catalog';

import type { SearchResultsState } from '../hooks/useSearchResults';
import { END_REACHED_THRESHOLD, resultType } from '../model/results';

type Ready = Extract<SearchResultsState, { status: 'ready' }>;

/** The results of the search on the route: placeholders, the list, or an inline error with a retry. */
export function SearchResults({ results }: { results: SearchResultsState }) {
  const { t } = useTranslation();

  switch (results.status) {
    case 'idle':
      return null;
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
      return <ResultList results={results} />;
  }
}

function ResultList({ results }: { results: Ready }) {
  const { t } = useTranslation();

  return (
    <FlashList
      testID="search-list"
      data={results.rows}
      keyExtractor={(row) => row.key}
      getItemType={resultType}
      renderItem={({ item }) => <CatalogCard node={item.node} />}
      ItemSeparatorComponent={Separator}
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
  count: { marginBottom: theme.spacing.md, gap: theme.spacing.xs },
  separator: { height: theme.spacing.md },
  footer: { padding: theme.spacing.xl, textAlign: 'center' },
  stale: { opacity: 0.5 },
}));
