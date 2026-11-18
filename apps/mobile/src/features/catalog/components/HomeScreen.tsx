import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Button } from '@/design-system';

import { useFeedPreview, type FeedPreviewItem } from '../hooks/useFeedPreview';

// Phase 0 placeholder. The English strings are temporary:
// the Text primitive arrives in task 1.2, i18n in 1.6, and the real feed in 2.5.

const PREVIEW_SIZE = 4;

function formatPrice(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

function describe(item: FeedPreviewItem): string {
  // `__typename` narrows the union, so each branch only sees the fields its type has.
  return item.__typename === 'Recipe'
    ? `${item.name} · ${item.cookTimeMin} min`
    : `${item.name} · ${formatPrice(item.priceCents)}`;
}

export function HomeScreen() {
  const preview = useFeedPreview(PREVIEW_SIZE);

  return (
    <View style={styles.screen}>
      <Text accessibilityRole="header" style={styles.title}>
        Pantry
      </Text>
      <Text style={styles.subtitle}>
        Groceries and recipes, with an assistant that helps you shop.
      </Text>

      <View style={styles.preview}>
        {preview.status === 'loading' && (
          <Text style={styles.status}>Loading from the mock API…</Text>
        )}
        {preview.status === 'error' && (
          <Text style={styles.status}>
            The mock API is not reachable. Start it with “pnpm dev:server” and reload.
          </Text>
        )}
        {preview.status === 'ready' && (
          <>
            <Text style={styles.status}>From the mock API:</Text>
            {preview.items.map((item) => (
              <Text key={item.id} style={styles.item}>
                {describe(item)}
              </Text>
            ))}
          </>
        )}
      </View>

      {/* Temporary links, so every route can be opened by hand. The real feed replaces them in 2.5. */}
      <View style={styles.links}>
        <Button
          title="Open a sample recipe"
          variant="secondary"
          onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: 'r1' } })}
        />
        <Button
          title="Open a sample product"
          variant="secondary"
          onPress={() => router.push({ pathname: '/product/[id]', params: { id: 'p1' } })}
        />
        <Button title="Ask the assistant" onPress={() => router.push('/assistant')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  title: { ...theme.typography.display, color: theme.colors.text },
  subtitle: { ...theme.typography.body, color: theme.colors.textMuted, textAlign: 'center' },
  links: { marginTop: theme.spacing.xl, alignSelf: 'stretch', gap: theme.spacing.sm },
  preview: { marginTop: theme.spacing.xl, alignItems: 'center', gap: theme.spacing.xs },
  status: { ...theme.typography.callout, color: theme.colors.textMuted, textAlign: 'center' },
  item: { ...theme.typography.callout, color: theme.colors.text },
}));
