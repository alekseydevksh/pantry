// English strings. This file defines the shape: `pl.ts` must have the same keys
// (a test checks it), and `t('...')` only accepts keys that exist here.
//
// Plurals use i18next suffixes: `itemCount_one`, `itemCount_other`. Polish needs two more forms
// (`_few`, `_many`), so the key sets differ only in those suffixes.
export const en = {
  common: {
    close: 'Close',
    retry: 'Try again',
    backToHome: 'Back to Home',
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
  catalog: {
    diet: {
      VEGETARIAN: 'Vegetarian',
      VEGAN: 'Vegan',
      GLUTEN_FREE: 'Gluten-free',
      DAIRY_FREE: 'Dairy-free',
    },
    allergen: {
      GLUTEN: 'Gluten',
      DAIRY: 'Dairy',
      EGGS: 'Eggs',
      NUTS: 'Nuts',
      PEANUTS: 'Peanuts',
      SOY: 'Soy',
      FISH: 'Fish',
      SHELLFISH: 'Shellfish',
      SESAME: 'Sesame',
    },
    suitableFor: 'Suitable for: {{list}}',
    contains: 'Contains: {{list}}',
    noAllergens: 'No listed allergens',
  },
  recipe: {
    loading: 'Loading the recipe',
    ingredients: 'Ingredients',
    steps: 'Method',
    step: 'Step {{number}}',
    ingredientLabel: '{{quantity}} {{name}}',
    totalPrice: 'Ingredients cost {{price}}',
    notFound: {
      title: 'Recipe not found',
      message: 'This recipe is not available any more.',
    },
    error: {
      title: 'Could not load the recipe',
      message: 'Check your connection and try again.',
    },
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
  // The product screen is still a placeholder (task 2.7).
  details: {
    product: 'Details for product {{id}}',
  },
};

/** The shape of a translation file, with any string value. */
export type Resource = typeof en;
