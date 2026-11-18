import { useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { SearchInput } from '@pantry/shared';

import { Button, Chip, Text } from '@/design-system';
import { currentLanguage, formatPrice, useTranslation } from '@/lib/i18n';

import {
  activeFilterCount,
  countOptions,
  PRICE_OPTIONS_CENTS,
  setSort,
  TIME_OPTIONS_MIN,
  toggleAllergen,
  toggleDiet,
  toggleMaxPrice,
  toggleMaxTime,
} from '../model/filters';
import { ALLERGENS, DEFAULT_SORT, DIETS, SORT_ORDERS } from '../model/searchValues';

export type FilterPanelProps = {
  input: SearchInput;
  /** Called with the new search; the screen writes it to the route. */
  onChange: (input: SearchInput) => void;
};

/** A "Filters" button that opens the chips for diet, time, price and allergens, and the sort. */
export function FilterPanel({ input, onChange }: FilterPanelProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const count = activeFilterCount(input);
  const filters = input.filters;

  return (
    <View style={styles.panel}>
      <Button
        variant="secondary"
        title={count > 0 ? t('search.filters.buttonActive', { count }) : t('search.filters.button')}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
      />
      {open ? (
        <View style={styles.groups}>
          <Group title={t('search.filters.diet')}>
            {DIETS.map((diet) => (
              <Chip
                key={diet}
                label={t(`catalog.diet.${diet}`)}
                selected={filters?.diets?.includes(diet) ?? false}
                onPress={() => onChange(toggleDiet(input, diet))}
              />
            ))}
          </Group>
          <Group title={t('search.filters.time')}>
            {countOptions(TIME_OPTIONS_MIN, filters?.maxTimeMin).map((minutes) => (
              <Chip
                key={minutes}
                label={t('search.filters.maxTime', { minutes })}
                selected={filters?.maxTimeMin === minutes}
                onPress={() => onChange(toggleMaxTime(input, minutes))}
              />
            ))}
          </Group>
          <Group title={t('search.filters.price')}>
            {countOptions(PRICE_OPTIONS_CENTS, filters?.maxPriceCents).map((cents) => (
              <Chip
                key={cents}
                label={t('search.filters.maxPrice', {
                  price: formatPrice(cents, currentLanguage()),
                })}
                selected={filters?.maxPriceCents === cents}
                onPress={() => onChange(toggleMaxPrice(input, cents))}
              />
            ))}
          </Group>
          <Group title={t('search.filters.allergens')}>
            {ALLERGENS.map((allergen) => (
              <Chip
                key={allergen}
                label={t(`search.filters.excludeAllergen.${allergen}`)}
                selected={filters?.excludeAllergens?.includes(allergen) ?? false}
                onPress={() => onChange(toggleAllergen(input, allergen))}
              />
            ))}
          </Group>
          <Group title={t('search.filters.sort')}>
            {SORT_ORDERS.map((sort) => (
              <Chip
                key={sort}
                label={t(`search.filters.sortOrder.${sort}`)}
                selected={(input.sort ?? DEFAULT_SORT) === sort}
                onPress={() => onChange(setSort(input, sort))}
              />
            ))}
          </Group>
        </View>
      ) : null}
    </View>
  );
}

/** A titled row of chips that scrolls sideways when it does not fit. */
function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View accessibilityLabel={title} style={styles.group}>
      <Text variant="caption" tone="muted" accessibilityRole="header">
        {title}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  panel: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.md,
  },
  groups: { gap: theme.spacing.md },
  group: { gap: theme.spacing.xs },
  row: { gap: theme.spacing.sm },
}));
