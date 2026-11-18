// Polish strings. Same keys as `en.ts`, except for plural forms: Polish has `_one`, `_few`,
// `_many` and `_other` (1 produkt, 2 produkty, 5 produktów, 1,5 produktu).
export const pl = {
  common: {
    close: 'Zamknij',
    retry: 'Spróbuj ponownie',
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
    askAssistant: 'Zapytaj asystenta',
  },
  feed: {
    kind: { product: 'Produkt', recipe: 'Przepis' },
    productLabel: '{{name}}, produkt, {{unit}}, {{price}}',
    recipeLabel: '{{name}}, przepis, {{minutes}} minut',
    cookTime: '{{minutes}} min',
    servings_one: '{{count}} porcja',
    servings_few: '{{count}} porcje',
    servings_many: '{{count}} porcji',
    servings_other: '{{count}} porcji',
    outOfStock: 'Brak w magazynie',
    loading: 'Wczytuję ofertę',
    loadingMore: 'Wczytuję więcej…',
    endOfFeed: 'To już wszystko.',
    error: {
      title: 'Nie udało się wczytać oferty',
      message: 'Sprawdź połączenie i spróbuj ponownie.',
    },
    loadMoreFailed: 'Nie udało się wczytać kolejnych pozycji.',
    refreshFailed: 'Nie udało się odświeżyć. Pociągnij w dół, aby spróbować ponownie.',
    empty: 'Na razie nic tu nie ma.',
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
    language: { title: 'Język' },
    theme: { title: 'Motyw', system: 'Systemowy', light: 'Jasny', dark: 'Ciemny' },
    aiMode: {
      title: 'Tryb asystenta',
      hint: 'Gdzie asystent może działać. Chmura wysyła Twoje wiadomości na nasz serwer.',
      auto: 'Automatyczny',
      'on-device': 'Tylko na urządzeniu',
      cloud: 'Tylko chmura',
      off: 'Wyłączony',
    },
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
