import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { formatPrice, i18n, pickLanguage, setLanguage, useTranslation } from '..';
import { en } from '../resources/en';
import { pl } from '../resources/pl';

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

function keysOf(resource: object, prefix = ''): string[] {
  return Object.entries(resource).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? keysOf(value, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

/** Plural forms of one word collapse into one key: `itemCount_one` and `itemCount_few` → `itemCount`. */
const withoutSuffix = (key: string) => key.replace(PLURAL_SUFFIX, '');
const baseKeys = (resource: object) => [
  ...new Set(keysOf(resource).map((key) => key.replace(PLURAL_SUFFIX, ''))),
];

describe('translation resources', () => {
  it('have the same keys in English and Polish', () => {
    expect(baseKeys(pl).sort()).toEqual(baseKeys(en).sort());
  });

  it.each([
    ['en', en],
    ['pl', pl],
  ])('have every plural form that %s needs, for every plural word', (language, resource) => {
    const needed = new Intl.PluralRules(language).resolvedOptions().pluralCategories;
    const keys = keysOf(resource);
    // A word is plural when one of its keys ends in a plural suffix (`cart.itemCount_one`).
    const words = [...new Set(keys.filter((key) => PLURAL_SUFFIX.test(key)).map(withoutSuffix))];

    expect(words).toEqual(expect.arrayContaining(['cart.itemCount', 'feed.servings']));
    for (const word of words) {
      const present = keys
        .filter((key) => PLURAL_SUFFIX.test(key) && withoutSuffix(key) === word)
        .map((key) => key.slice(key.lastIndexOf('_') + 1));
      expect({ word, forms: present.sort() }).toEqual({ word, forms: [...needed].sort() });
    }
  });

  it('have no empty strings', () => {
    expect([...keysOf(en), ...keysOf(pl)].length).toBeGreaterThan(0);
    for (const resource of [en, pl]) {
      for (const key of keysOf(resource)) {
        const value = key
          .split('.')
          .reduce<unknown>((node, part) => (node as never)[part], resource);
        expect(value).not.toBe('');
      }
    }
  });
});

describe('pickLanguage', () => {
  it('takes the first supported device language', () => {
    expect(
      pickLanguage([{ languageCode: 'de' }, { languageCode: 'pl' }, { languageCode: 'en' }]),
    ).toBe('pl');
  });

  it('falls back to English when no device language is supported', () => {
    expect(pickLanguage([{ languageCode: 'de' }, { languageCode: null }])).toBe('en');
    expect(pickLanguage([])).toBe('en');
  });
});

describe('formatPrice', () => {
  it('writes euros the way the language does', () => {
    expect(formatPrice(249, 'en')).toBe('€2.49');
    expect(formatPrice(249, 'pl')).toMatch(/^2,49\s€$/);
  });
});

function CartCount({ count }: { count: number }) {
  const { t } = useTranslation();
  return <Text>{t('cart.itemCount', { count })}</Text>;
}

describe('language', () => {
  afterEach(async () => {
    await setLanguage('en');
  });

  it('starts in English in tests', () => {
    expect(i18n.language).toBe('en');
  });

  it('uses the Polish plural rules', async () => {
    await setLanguage('pl');

    expect(i18n.t('cart.itemCount', { count: 1 })).toBe('1 produkt');
    expect(i18n.t('cart.itemCount', { count: 2 })).toBe('2 produkty');
    expect(i18n.t('cart.itemCount', { count: 5 })).toBe('5 produktów');
    expect(i18n.t('cart.itemCount', { count: 22 })).toBe('22 produkty');
    expect(i18n.t('cart.itemCount', { count: 0 })).toBe('0 produktów');
  });

  it('uses the English plural rules', () => {
    expect(i18n.t('cart.itemCount', { count: 1 })).toBe('1 item');
    expect(i18n.t('cart.itemCount', { count: 2 })).toBe('2 items');
  });

  it('updates a mounted component without a restart', async () => {
    await render(<CartCount count={5} />);
    expect(screen.getByText('5 items')).toBeOnTheScreen();

    await act(async () => {
      await setLanguage('pl');
    });

    expect(screen.getByText('5 produktów')).toBeOnTheScreen();
  });
});
