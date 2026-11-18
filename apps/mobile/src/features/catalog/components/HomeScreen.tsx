import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Button, Screen } from '@/design-system';
import { currentLanguage, formatPrice, useTranslation } from '@/lib/i18n';

import { useFeedPreview, type FeedPreviewItem } from '../hooks/useFeedPreview';

// Phase 0 placeholder, replaced by the real feed in task 2.5.

const PREVIEW_SIZE = 4;

export function HomeScreen() {
  const { t } = useTranslation();
  const preview = useFeedPreview(PREVIEW_SIZE);

  function describe(item: FeedPreviewItem): string {
    // `__typename` narrows the union, so each branch only sees the fields its type has.
    return item.__typename === 'Recipe'
      ? t('home.recipeMeta', { name: item.name, minutes: item.cookTimeMin })
      : t('home.productMeta', {
          name: item.name,
          price: formatPrice(item.priceCents, currentLanguage()),
        });
  }

  return (
    <Screen bottomInset={false} style={styles.screen}>
      <Text accessibilityRole="header" style={styles.title}>
        {t('home.title')}
      </Text>
      <Text style={styles.subtitle}>{t('home.subtitle')}</Text>

      <View style={styles.preview}>
        {preview.status === 'loading' && <Text style={styles.status}>{t('home.loading')}</Text>}
        {preview.status === 'error' && <Text style={styles.status}>{t('home.error')}</Text>}
        {preview.status === 'ready' && (
          <>
            <Text style={styles.status}>{t('home.fromApi')}</Text>
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
          title={t('home.openRecipe')}
          variant="secondary"
          onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: 'r1' } })}
        />
        <Button
          title={t('home.openProduct')}
          variant="secondary"
          onPress={() => router.push({ pathname: '/product/[id]', params: { id: 'p1' } })}
        />
        <Button title={t('home.askAssistant')} onPress={() => router.push('/assistant')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: { alignItems: 'center', justifyContent: 'center' },
  title: { ...theme.typography.display, color: theme.colors.text },
  subtitle: { ...theme.typography.body, color: theme.colors.textMuted, textAlign: 'center' },
  links: { marginTop: theme.spacing.xl, alignSelf: 'stretch', gap: theme.spacing.sm },
  preview: { marginTop: theme.spacing.xl, alignItems: 'center', gap: theme.spacing.xs },
  status: { ...theme.typography.callout, color: theme.colors.textMuted, textAlign: 'center' },
  item: { ...theme.typography.callout, color: theme.colors.text },
}));
