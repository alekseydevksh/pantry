import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Card, Skeleton } from '@/design-system';
import { useTranslation } from '@/lib/i18n';

const PLACEHOLDER_CARDS = 4;

/**
 * Card-shaped placeholders for the first load of a list of catalog items. One label tells a screen
 * reader what is loading: the feed's by default, or the `label` of another list (the search results).
 */
export function FeedSkeleton({ label }: { label?: string }) {
  const { t } = useTranslation();

  return (
    <View
      accessible
      accessibilityLabel={label ?? t('feed.loading')}
      accessibilityRole="progressbar"
    >
      {Array.from({ length: PLACEHOLDER_CARDS }, (_, index) => (
        <Card key={index} style={styles.card}>
          <Skeleton style={styles.image} radius={0} />
          <View style={styles.body}>
            <Skeleton width="30%" style={styles.line} />
            <Skeleton width="80%" style={styles.title} />
            <Skeleton width="50%" style={styles.line} />
          </View>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: { padding: 0, overflow: 'hidden', gap: 0, marginBottom: theme.spacing.md },
  body: { padding: theme.spacing.lg, gap: theme.spacing.sm },
  image: { height: theme.sizes.cardImage },
  line: { height: theme.spacing.md },
  title: { height: theme.spacing.lg },
}));
