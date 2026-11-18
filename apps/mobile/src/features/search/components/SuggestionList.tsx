import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Text } from '@/design-system';
import { useTranslation } from '@/lib/i18n';

export type SuggestionListProps = {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
};

/** The typeahead suggestions under the field. A tap searches for that text. */
export function SuggestionList({ suggestions, onSelect }: SuggestionListProps) {
  const { t } = useTranslation();
  if (suggestions.length === 0) return null;

  return (
    <View accessibilityLabel={t('search.suggestions.label')} style={styles.list}>
      {suggestions.map((suggestion) => (
        <Pressable
          key={suggestion}
          accessibilityRole="button"
          accessibilityLabel={suggestion}
          onPress={() => onSelect(suggestion)}
          style={styles.row}
        >
          <Text numberOfLines={1}>{suggestion}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  list: { gap: theme.spacing.none },
  row: {
    minHeight: theme.sizes.minTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
}));
