import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { useStore } from 'zustand';

import { Button, Chip, Text } from '@/design-system';
import { FLAG_KEYS, FLAGS, getFlagsRuntime, type FlagKey, type Variant } from '@/flags';
import { useTranslation } from '@/lib/i18n';

/**
 * The debug panel (PLAN 3.8): every flag with the variant this user has and why, and a chip per
 * variant to override it. An override is kept across restarts (ADR 0012, Decision 5).
 */
export function FlagDebugPanel() {
  const { t } = useTranslation();

  return (
    <View style={styles.section} testID="flag-debug-panel">
      <Text variant="headline" accessibilityRole="header">
        {t('settings.flags.title')}
      </Text>
      <Text variant="callout" tone="muted">
        {t('settings.flags.hint')}
      </Text>
      {FLAG_KEYS.map((key) => (
        <FlagRow key={key} flagKey={key} />
      ))}
    </View>
  );
}

function FlagRow({ flagKey }: { flagKey: FlagKey }) {
  const { t } = useTranslation();
  const { flags, overridesStore } = getFlagsRuntime();
  const overrides = useStore(overridesStore, (state) => state.overrides);
  const { setOverride, clearOverride } = overridesStore.getState();
  // `peek` does not log an exposure: looking at the panel is not seeing the experiment.
  const { variant, source } = flags.peek(flagKey, overrides);
  const definition = FLAGS[flagKey];

  return (
    <View style={styles.flag}>
      <Text variant="label">{flagKey}</Text>
      <Text variant="callout" tone="muted">
        {definition.description}
      </Text>
      <Text variant="callout" accessibilityLiveRegion="polite">
        {t('settings.flags.current', { variant, source: t(`settings.flags.source.${source}`) })}
      </Text>
      <View style={styles.options}>
        {definition.variants.map((value) => (
          <Chip
            key={value}
            label={value}
            accessibilityLabel={t('settings.flags.override', { flag: flagKey, variant: value })}
            selected={variant === value}
            onPress={() => setOverride(flagKey, value as Variant<FlagKey>)}
          />
        ))}
      </View>
      {source === 'override' ? (
        <Button
          variant="ghost"
          title={t('settings.flags.reset')}
          accessibilityLabel={t('settings.flags.resetLabel', { flag: flagKey })}
          onPress={() => clearOverride(flagKey)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  section: { gap: theme.spacing.sm },
  flag: { gap: theme.spacing.xs, paddingVertical: theme.spacing.sm },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
}));
