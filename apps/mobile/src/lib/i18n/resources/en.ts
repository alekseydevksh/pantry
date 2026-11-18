// English strings. This file defines the shape: `pl.ts` must have the same keys
// (a test checks it), and `t('...')` only accepts keys that exist here.
//
// Plurals use i18next suffixes: `itemCount_one`, `itemCount_other`. Polish needs two more forms
// (`_few`, `_many`), so the key sets differ only in those suffixes.
export const en = {
  common: {
    close: 'Close',
    retry: 'Try again',
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
    askAssistant: 'Ask the assistant',
  },
  feed: {
    kind: { product: 'Product', recipe: 'Recipe' },
    // Accessibility labels of a whole card: what it is, then the facts a user would want to hear.
    productLabel: '{{name}}, product, {{unit}}, {{price}}',
    recipeLabel: '{{name}}, recipe, {{minutes}} minutes',
    cookTime: '{{minutes}} min',
    servings_one: '{{count}} serving',
    servings_other: '{{count}} servings',
    outOfStock: 'Out of stock',
    loading: 'Loading the feed',
    loadingMore: 'Loading more…',
    endOfFeed: 'You have seen everything.',
    error: {
      title: 'Could not load the feed',
      message: 'Check your connection and try again.',
    },
    loadMoreFailed: 'Could not load more items.',
    refreshFailed: 'Could not refresh. Pull down to try again.',
    empty: 'There is nothing here yet.',
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
