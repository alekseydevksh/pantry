// Polish strings. Same keys as `en.ts`, except for plural forms: Polish has `_one`, `_few`,
// `_many` and `_other` (1 produkt, 2 produkty, 5 produktów, 1,5 produktu).
export const pl = {
  common: {
    close: 'Zamknij',
  },
  tabs: {
    home: 'Start',
    search: 'Szukaj',
    cart: 'Koszyk',
    settings: 'Ustawienia',
  },
  screens: {
    recipe: 'Przepis',
    product: 'Produkt',
    assistant: 'Asystent',
  },
  home: {
    title: 'Pantry',
    subtitle: 'Zakupy i przepisy z asystentem, który pomaga w zakupach.',
    loading: 'Wczytuję dane z testowego API…',
    error: 'Testowe API jest niedostępne. Uruchom je poleceniem „pnpm dev:server” i odśwież.',
    fromApi: 'Z testowego API:',
    recipeMeta: '{{name}} · {{minutes}} min',
    productMeta: '{{name}} · {{price}}',
    openRecipe: 'Otwórz przykładowy przepis',
    openProduct: 'Otwórz przykładowy produkt',
    askAssistant: 'Zapytaj asystenta',
  },
  search: {
    title: 'Szukaj',
    body: 'Tutaj wyszukasz produkty i przepisy.',
  },
  cart: {
    title: 'Koszyk',
    empty: 'Twój koszyk jest pusty.',
    itemCount_one: '{{count}} produkt',
    itemCount_few: '{{count}} produkty',
    itemCount_many: '{{count}} produktów',
    itemCount_other: '{{count}} produktu',
  },
  settings: {
    title: 'Ustawienia',
    body: 'Język, motyw i tryb AI.',
  },
  assistant: {
    title: 'Asystent',
    body: 'Zapytaj o przepisy, produkty i pomysły na posiłki.',
  },
  details: {
    recipe: 'Szczegóły przepisu {{id}}',
    product: 'Szczegóły produktu {{id}}',
  },
};
