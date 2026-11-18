import { Screen, Text } from '@/design-system';
import { useTranslation } from '@/lib/i18n';
import { FeatureErrorBoundary } from '@/lib/error-boundary';

// Placeholder screen, replaced by the real feature later.
export function SearchScreen() {
  return (
    <FeatureErrorBoundary feature="search">
      <SearchContent />
    </FeatureErrorBoundary>
  );
}

function SearchContent() {
  const { t } = useTranslation();

  return (
    <Screen bottomInset={false}>
      <Text variant="title" accessibilityRole="header">
        {t('search.title')}
      </Text>
      <Text tone="muted">{t('search.body')}</Text>
    </Screen>
  );
}
