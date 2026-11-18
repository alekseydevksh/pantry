import { Screen, Text } from '@/design-system';
import { useTranslation } from '@/lib/i18n';

// Placeholder screen, replaced by the real feature later.
export function SearchScreen() {
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
