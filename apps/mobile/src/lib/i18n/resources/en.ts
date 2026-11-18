// English strings. This file defines the shape: `pl.ts` must have the same keys
// (a test checks it), and `t('...')` only accepts keys that exist here.
//
// Plurals use i18next suffixes: `itemCount_one`, `itemCount_other`. Polish needs two more forms
// (`_few`, `_many`), so the key sets differ only in those suffixes.
export const en = {
  common: {
    close: 'Close',
  },
  tabs: {
    home: 'Home',
    search: 'Search',
    cart: 'Cart',
    settings: 'Settings',
  },
  screens: {
    recipe: 'Recipe',
    product: 'Product',
    assistant: 'Assistant',
  },
  home: {
    title: 'Pantry',
    subtitle: 'Groceries and recipes, with an assistant that helps you shop.',
    loading: 'Loading from the mock API…',
    error: 'The mock API is not reachable. Start it with “pnpm dev:server” and reload.',
    fromApi: 'From the mock API:',
    recipeMeta: '{{name}} · {{minutes}} min',
    productMeta: '{{name}} · {{price}}',
    openRecipe: 'Open a sample recipe',
    openProduct: 'Open a sample product',
    askAssistant: 'Ask the assistant',
  },
  search: {
    title: 'Search',
    body: 'Search for groceries and recipes here.',
  },
  cart: {
    title: 'Cart',
    empty: 'Your cart is empty.',
    itemCount_one: '{{count}} item',
    itemCount_other: '{{count}} items',
  },
  settings: {
    title: 'Settings',
    language: { title: 'Language' },
    theme: { title: 'Theme', system: 'System', light: 'Light', dark: 'Dark' },
    aiMode: {
      title: 'Assistant mode',
      hint: 'Where the assistant may run. Cloud sends your messages to our server.',
      auto: 'Automatic',
      'on-device': 'On-device only',
      cloud: 'Cloud only',
      off: 'Off',
    },
  },
  assistant: {
    title: 'Assistant',
    body: 'Ask for recipes, products and meal ideas.',
  },
  details: {
    recipe: 'Details for recipe {{id}}',
    product: 'Details for product {{id}}',
  },
};

/** The shape of a translation file, with any string value. */
export type Resource = typeof en;
