import { StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useFeedPreview, type FeedPreviewItem } from '../hooks/useFeedPreview';

// Phase 0 placeholder. Raw colors, spacing and English strings are temporary:
// theme tokens arrive in task 1.1, i18n in 1.6, and the real feed in 2.5.
const palette = {
  light: { background: '#FAF4E6', text: '#1F2A24', muted: '#5B6B62' },
  dark: { background: '#14201A', text: '#FAF4E6', muted: '#A9B8AF' },
};

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
  const colors = palette[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const preview = useFeedPreview(PREVIEW_SIZE);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
        Pantry
      </Text>
      <Text style={[styles.subtitle, { color: colors.muted }]}>
        Groceries and recipes, with an assistant that helps you shop.
      </Text>

      <View style={styles.preview}>
        {preview.status === 'loading' && (
          <Text style={[styles.status, { color: colors.muted }]}>Loading from the mock API…</Text>
        )}
        {preview.status === 'error' && (
          <Text style={[styles.status, { color: colors.muted }]}>
            The mock API is not reachable. Start it with “pnpm dev:server” and reload.
          </Text>
        )}
        {preview.status === 'ready' && (
          <>
            <Text style={[styles.status, { color: colors.muted }]}>From the mock API:</Text>
            {preview.items.map((item) => (
              <Text key={item.id} style={[styles.item, { color: colors.text }]}>
                {describe(item)}
              </Text>
            ))}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  title: { fontSize: 34, fontWeight: '700' },
  subtitle: { fontSize: 17, textAlign: 'center' },
  preview: { marginTop: 24, alignItems: 'center', gap: 4 },
  status: { fontSize: 15, textAlign: 'center' },
  item: { fontSize: 15 },
});
