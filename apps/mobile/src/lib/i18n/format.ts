import type { Language } from './languages';

/** Euro price from integer cents, in the number style of the language ("€2.49", "2,49 €"). */
export function formatPrice(cents: number, language: Language): string {
  return new Intl.NumberFormat(language, { style: 'currency', currency: 'EUR' }).format(
    cents / 100,
  );
}
