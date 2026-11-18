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
  errors: {
    feature: {
      title: 'Something went wrong',
      message: 'This screen ran into a problem. Try again.',
    },
  },
  offline: {
    banner: 'You are offline. What you see may be out of date.',
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
  product: {
    loading: 'Loading the product',
    inStock: 'In stock',
    addToCart: 'Add to cart',
    notFound: {
      title: 'Product not found',
      message: 'This product is not available any more.',
    },
    error: {
      title: 'Could not load the product',
      message: 'Check your connection and try again.',
    },
  },
  search: {
    title: 'Search',
    field: {
      label: 'Search groceries and recipes',
      placeholder: 'Search groceries and recipes',
      clear: 'Clear the search',
    },
    results: {
      loading: 'Loading the results',
      count_one: '{{count}} result',
      count_other: '{{count}} results',
      end: 'That is everything.',
    },
    error: {
      title: 'Could not load the results',
      message: 'Check your connection and try again.',
    },
    filters: {
      button: 'Filters',
      buttonActive: 'Filters ({{count}})',
      diet: 'Diet',
      time: 'Cooking time',
      price: 'Price',
      allergens: 'Allergens',
      sort: 'Sort by',
      maxTime: 'Up to {{minutes}} min',
      maxPrice: 'Up to {{price}}',
      excludeAllergen: {
        GLUTEN: 'No gluten',
        DAIRY: 'No dairy',
        EGGS: 'No eggs',
        NUTS: 'No nuts',
        PEANUTS: 'No peanuts',
        SOY: 'No soy',
        FISH: 'No fish',
        SHELLFISH: 'No shellfish',
        SESAME: 'No sesame',
      },
      sortOrder: {
        RELEVANCE: 'Relevance',
        PRICE_ASC: 'Price: low to high',
        PRICE_DESC: 'Price: high to low',
        TIME_ASC: 'Quickest first',
      },
    },
    empty: {
      idleTitle: 'Find groceries and recipes',
      idleMessage: 'Type in the field above, or start with one of these.',
      title: 'No results for "{{query}}"',
      titleNoQuery: 'No results',
      reason: {
        text: 'Check the spelling, or try a shorter or different word.',
        filters: 'Nothing matches all of these filters. Try removing some.',
        productsHaveNoTime:
          'Products have no cooking time, so a time limit finds only recipes. Remove the filters, or search for recipes.',
      },
      clearFilters: 'Clear filters',
      try: 'Try searching for',
      searchFor: 'Search for {{query}}',
    },
    suggestions: { label: 'Suggestions' },
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
    flags: {
      title: 'Feature flags',
      hint: 'Debug panel. Pick a variant to override the one assigned to this device.',
      current: 'Variant: {{variant}} ({{source}})',
      source: { override: 'override', assignment: 'assigned', default: 'default' },
      override: 'Use {{variant}} for {{flag}}',
      reset: 'Use the assigned variant',
      resetLabel: 'Remove the override of {{flag}}',
    },
  },
  assistant: {
    title: 'Assistant',
    body: 'Ask for recipes, products and meal ideas.',
  },
};

/** The shape of a translation file, with any string value. */
export type Resource = typeof en;
