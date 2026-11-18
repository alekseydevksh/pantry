import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Button, ErrorState, Screen, Text } from '@/design-system';
import { useTranslation } from '@/lib/i18n';

import { useFeed, type FeedState } from '../hooks/useFeed';
import { END_REACHED_THRESHOLD, rowType } from '../model/feed';
import { FeedRowView } from './FeedRowView';
import { FeedSkeleton } from './FeedSkeleton';

export function HomeScreen() {
  const { t } = useTranslation();
  const feed = useFeed();

  return (
    <Screen bottomInset={false} style={styles.screen}>
      {feed.status === 'ready' ? (
        <FeedList feed={feed} />
      ) : (
        <View style={styles.content}>
          <FeedHeader />
          {feed.status === 'loading' ? (
            <FeedSkeleton />
          ) : (
            <ErrorState
              title={t('feed.error.title')}
              message={t('feed.error.message')}
              retryLabel={t('common.retry')}
              onRetry={feed.retry}
            />
          )}
        </View>
      )}
    </Screen>
  );
}

function FeedHeader({ notice }: { notice?: string }) {
  const { t } = useTranslation();

  return (
    <View style={styles.header}>
      <Text variant="display" accessibilityRole="header">
        {t('home.title')}
      </Text>
      <Text tone="muted">{t('home.subtitle')}</Text>
      <Button title={t('home.askAssistant')} onPress={() => router.push('/assistant')} />
      {notice ? (
        <Text tone="danger" accessibilityRole="alert">
          {notice}
        </Text>
      ) : null}
    </View>
  );
}

function FeedFooter({ feed }: { feed: Extract<FeedState, { status: 'ready' }> }) {
  const { t } = useTranslation();

  if (feed.loadMoreFailed) {
    return (
      <ErrorState
        title={t('feed.loadMoreFailed')}
        retryLabel={t('common.retry')}
        onRetry={feed.retryLoadMore}
      />
    );
  }
  if (feed.loadingMore) {
    return (
      <View style={styles.footer} accessible accessibilityLabel={t('feed.loadingMore')}>
        <ActivityIndicator />
      </View>
    );
  }
  if (!feed.hasNextPage) {
    return (
      <Text tone="muted" style={styles.footer}>
        {t('feed.endOfFeed')}
      </Text>
    );
  }
  return null;
}

function FeedList({ feed }: { feed: Extract<FeedState, { status: 'ready' }> }) {
  const { t } = useTranslation();

  return (
    <FlashList
      testID="feed-list"
      data={feed.rows}
      keyExtractor={(row) => row.key}
      // Products and recipes have different layouts, so each type gets its own pool of recycled rows.
      getItemType={rowType}
      renderItem={({ item }) => <FeedRowView row={item} />}
      ItemSeparatorComponent={Separator}
      ListHeaderComponent={
        <FeedHeader notice={feed.refreshFailed ? t('feed.refreshFailed') : undefined} />
      }
      ListEmptyComponent={<Text tone="muted">{t('feed.empty')}</Text>}
      ListFooterComponent={<FeedFooter feed={feed} />}
      onEndReached={feed.loadMore}
      onEndReachedThreshold={END_REACHED_THRESHOLD}
      refreshing={feed.refreshing}
      onRefresh={feed.refresh}
      contentContainerStyle={styles.listContent}
    />
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create((theme) => ({
  // The list scrolls edge to edge; its own content padding keeps the cards off the screen edges.
  screen: { padding: theme.spacing.none, gap: theme.spacing.none },
  content: { padding: theme.spacing.lg },
  listContent: { padding: theme.spacing.lg },
  header: { gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  separator: { height: theme.spacing.md },
  footer: { padding: theme.spacing.xl, textAlign: 'center' },
}));
