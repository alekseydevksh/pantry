import { ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Chip, Text } from '@/design-system';
import { useTranslation } from '@/lib/i18n';
import { FeatureErrorBoundary } from '@/lib/error-boundary';
import { SUPPORTED_LANGUAGES, type Language } from '@/lib/i18n/languages';

import { useSettings } from '../hooks/useSettings';
import { AI_MODES, THEME_PREFERENCES } from '../model/settings';
import { FlagDebugPanel } from './FlagDebugPanel';

// Language names are written in their own language, so a user can find theirs.
const LANGUAGE_NAMES: Record<Language, string> = { en: 'English', pl: 'Polski' };

export function SettingsScreen() {
  return (
    <FeatureErrorBoundary feature="settings">
      <SettingsContent />
    </FeatureErrorBoundary>
  );
}

function SettingsContent() {
  const { t } = useTranslation();
  const { language, theme, aiMode, setLanguage, setTheme, setAiMode } = useSettings((s) => s);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text variant="title" accessibilityRole="header">
        {t('settings.title')}
      </Text>

      <View style={styles.section}>
        <Text variant="headline" accessibilityRole="header">
          {t('settings.language.title')}
        </Text>
        <View style={styles.options}>
          {SUPPORTED_LANGUAGES.map((value) => (
            <Chip
              key={value}
              label={LANGUAGE_NAMES[value]}
              selected={language === value}
              onPress={() => setLanguage(value)}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text variant="headline" accessibilityRole="header">
          {t('settings.theme.title')}
        </Text>
        <View style={styles.options}>
          {THEME_PREFERENCES.map((value) => (
            <Chip
              key={value}
              label={t(`settings.theme.${value}`)}
              selected={theme === value}
              onPress={() => setTheme(value)}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text variant="headline" accessibilityRole="header">
          {t('settings.aiMode.title')}
        </Text>
        <Text variant="callout" tone="muted">
          {t('settings.aiMode.hint')}
        </Text>
        <View style={styles.options}>
          {AI_MODES.map((value) => (
            <Chip
              key={value}
              label={t(`settings.aiMode.${value}`)}
              selected={aiMode === value}
              onPress={() => setAiMode(value)}
            />
          ))}
        </View>
      </View>

      <FlagDebugPanel />
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.xl, gap: theme.spacing.xl },
  section: { gap: theme.spacing.sm },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
}));
