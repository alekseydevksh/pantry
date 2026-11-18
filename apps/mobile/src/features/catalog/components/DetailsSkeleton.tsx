import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Skeleton } from '@/design-system';

/** Placeholder for the photo, title and meta line at the top of a details screen. */
export function HeaderSkeleton() {
  return (
    <View>
      <Skeleton radius={0} style={styles.hero} />
      <View style={styles.text}>
        <Skeleton width="70%" style={styles.title} />
        <Skeleton width="40%" style={styles.line} />
      </View>
    </View>
  );
}

/** Placeholder for the text blocks below the header. `label` tells a screen reader what is loading. */
export function BodySkeleton({ label }: { label: string }) {
  return (
    <View style={styles.body} accessible accessibilityRole="progressbar" accessibilityLabel={label}>
      <Skeleton style={styles.line} />
      <Skeleton width="90%" style={styles.line} />
      <Skeleton width="60%" style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  hero: { height: theme.sizes.heroImage },
  text: { padding: theme.spacing.lg, gap: theme.spacing.sm },
  body: { gap: theme.spacing.md },
  title: { height: theme.spacing.xl },
  line: { height: theme.spacing.md },
}));
