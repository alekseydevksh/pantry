// Deterministic generator for the seed catalog: about 200 products and 60 recipes.
// Pure: same seed in, same catalog out. `scripts/seed.ts` writes the result to `data/`.
import {
  ALLERGENS,
  DIETS,
  type Allergen,
  type Category,
  type Diet,
  type SeedProduct,
  type SeedRecipe,
} from './schema';

export const SEED = 20261116;

/** mulberry32: a small seeded PRNG. `Math.random` cannot be seeded. */
function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, items: readonly T[]): T {
  const item = items[Math.floor(rng() * items.length)];
  if (item === undefined) throw new Error('pick() from an empty list');
  return item;
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

type BaseFlag = 'meat' | 'animal';

/** name, price in cents, pack size, allergens, flags (`meat` = not vegetarian, `animal` = vegetarian but not vegan) */
type BaseProduct = readonly [
  name: string,
  priceCents: number,
  unit: string,
  allergens?: readonly Allergen[],
  flag?: BaseFlag,
];

const BASE_PRODUCTS: Record<Category, readonly BaseProduct[]> = {
  PRODUCE: [
    ['Tomatoes', 249, '500 g'],
    ['Cucumber', 99, '1 pc'],
    ['Bell Pepper', 129, '1 pc'],
    ['Spinach', 199, '200 g'],
    ['Carrots', 119, '1 kg'],
    ['Onions', 109, '1 kg'],
    ['Garlic', 89, '1 bulb'],
    ['Potatoes', 189, '2 kg'],
    ['Sweet Potatoes', 229, '1 kg'],
    ['Broccoli', 159, '1 pc'],
    ['Mushrooms', 179, '250 g'],
    ['Zucchini', 139, '2 pcs'],
    ['Avocado', 149, '1 pc'],
    ['Lemons', 159, '4 pcs'],
    ['Bananas', 139, '5 pcs'],
    ['Apples', 219, '6 pcs'],
    ['Blueberries', 299, '150 g'],
    ['Basil', 149, '1 pot'],
    ['Coriander', 129, '1 bunch'],
    ['Ginger', 99, '100 g'],
  ],
  DAIRY_AND_EGGS: [
    ['Whole Milk', 129, '1 l', ['DAIRY'], 'animal'],
    ['Butter', 249, '250 g', ['DAIRY'], 'animal'],
    ['Greek Yogurt', 199, '500 g', ['DAIRY'], 'animal'],
    ['Cheddar', 329, '350 g', ['DAIRY'], 'animal'],
    ['Mozzarella', 149, '125 g', ['DAIRY'], 'animal'],
    ['Parmesan', 399, '200 g', ['DAIRY'], 'animal'],
    ['Feta', 229, '200 g', ['DAIRY'], 'animal'],
    ['Double Cream', 179, '300 ml', ['DAIRY'], 'animal'],
    ['Eggs', 279, '10 pcs', ['EGGS'], 'animal'],
    ['Oat Drink', 189, '1 l', ['GLUTEN']],
    ['Soy Yogurt', 219, '400 g', ['SOY']],
    ['Halloumi', 299, '225 g', ['DAIRY'], 'animal'],
  ],
  MEAT_AND_FISH: [
    ['Chicken Breast', 549, '500 g', [], 'meat'],
    ['Chicken Thighs', 449, '600 g', [], 'meat'],
    ['Beef Mince', 499, '500 g', [], 'meat'],
    ['Beef Steak', 799, '2 pcs', [], 'meat'],
    ['Pork Sausages', 349, '8 pcs', ['GLUTEN'], 'meat'],
    ['Bacon', 299, '200 g', [], 'meat'],
    ['Salmon Fillet', 699, '2 pcs', ['FISH'], 'meat'],
    ['Cod Fillet', 599, '2 pcs', ['FISH'], 'meat'],
    ['Prawns', 549, '200 g', ['SHELLFISH'], 'meat'],
    ['Smoked Tofu', 279, '200 g', ['SOY']],
    ['Turkey Mince', 429, '500 g', [], 'meat'],
    ['Tuna Steak', 749, '2 pcs', ['FISH'], 'meat'],
  ],
  BAKERY: [
    ['Sourdough Loaf', 349, '1 pc', ['GLUTEN']],
    ['Wholemeal Bread', 189, '1 pc', ['GLUTEN']],
    ['Tortilla Wraps', 199, '8 pcs', ['GLUTEN']],
    ['Pita Bread', 149, '6 pcs', ['GLUTEN']],
    ['Burger Buns', 179, '4 pcs', ['GLUTEN', 'SESAME']],
    ['Croissants', 259, '4 pcs', ['GLUTEN', 'DAIRY', 'EGGS'], 'animal'],
    ['Gluten-Free Bread', 329, '1 pc', ['EGGS'], 'animal'],
    ['Naan', 169, '2 pcs', ['GLUTEN', 'DAIRY'], 'animal'],
  ],
  PANTRY: [
    ['Spaghetti', 129, '500 g', ['GLUTEN']],
    ['Penne', 129, '500 g', ['GLUTEN']],
    ['Basmati Rice', 249, '1 kg'],
    ['Risotto Rice', 229, '500 g'],
    ['Couscous', 159, '500 g', ['GLUTEN']],
    ['Quinoa', 349, '500 g'],
    ['Red Lentils', 199, '500 g'],
    ['Chickpeas', 89, '400 g'],
    ['Black Beans', 89, '400 g'],
    ['Chopped Tomatoes', 79, '400 g'],
    ['Coconut Milk', 149, '400 ml'],
    ['Olive Oil', 699, '500 ml'],
    ['Sesame Oil', 349, '250 ml', ['SESAME']],
    ['Soy Sauce', 229, '150 ml', ['SOY', 'GLUTEN']],
    ['Vegetable Stock', 149, '6 cubes'],
    ['Peanut Butter', 279, '340 g', ['PEANUTS']],
    ['Honey', 399, '340 g', [], 'animal'],
    ['Plain Flour', 119, '1 kg', ['GLUTEN']],
    ['Rolled Oats', 149, '1 kg', ['GLUTEN']],
    ['Curry Paste', 219, '200 g'],
    ['Tomato Paste', 99, '200 g'],
    ['Egg Noodles', 159, '250 g', ['GLUTEN', 'EGGS'], 'animal'],
    ['Rice Noodles', 179, '250 g'],
    ['Tahini', 329, '300 g', ['SESAME']],
    ['Pesto', 249, '190 g', ['DAIRY', 'NUTS'], 'animal'],
    ['Chili Flakes', 129, '35 g'],
    ['Cumin', 119, '40 g'],
    ['Paprika', 119, '45 g'],
  ],
  FROZEN: [
    ['Frozen Peas', 149, '900 g'],
    ['Frozen Berries', 329, '500 g'],
    ['Frozen Spinach', 139, '900 g'],
    ['Fish Fingers', 299, '10 pcs', ['FISH', 'GLUTEN'], 'meat'],
    ['Vanilla Ice Cream', 349, '900 ml', ['DAIRY', 'EGGS'], 'animal'],
    ['Frozen Sweetcorn', 139, '900 g'],
    ['Veggie Burgers', 319, '4 pcs', ['SOY', 'GLUTEN']],
    ['Frozen Edamame', 259, '500 g', ['SOY']],
  ],
  DRINKS: [
    ['Orange Juice', 249, '1 l'],
    ['Sparkling Water', 79, '1.5 l'],
    ['Cold Brew Coffee', 299, '500 ml'],
    ['Green Tea', 219, '20 bags'],
    ['Apple Juice', 199, '1 l'],
    ['Kombucha', 279, '330 ml'],
    ['Almond Drink', 219, '1 l', ['NUTS']],
  ],
  SNACKS: [
    ['Mixed Nuts', 399, '200 g', ['NUTS']],
    ['Roasted Peanuts', 199, '200 g', ['PEANUTS']],
    ['Dark Chocolate', 229, '100 g', ['SOY']],
    ['Hummus', 179, '200 g', ['SESAME']],
    ['Tortilla Chips', 169, '200 g'],
    ['Granola Bars', 249, '6 pcs', ['GLUTEN', 'NUTS']],
    ['Rice Cakes', 129, '130 g'],
    ['Walnuts', 349, '150 g', ['NUTS']],
  ],
};

const CATEGORY_BLURB: Record<Category, string> = {
  PRODUCE: 'Picked fresh and delivered chilled.',
  DAIRY_AND_EGGS: 'Kept cold from the dairy to your door.',
  MEAT_AND_FISH: 'Prepared by our butchers and fishmongers.',
  BAKERY: 'Baked this morning.',
  PANTRY: 'A cupboard staple for everyday cooking.',
  FROZEN: 'Frozen within hours to lock in flavour.',
  DRINKS: 'Best served cold.',
  SNACKS: 'For the gap between meals.',
};

/** The second version of every base product gets one of these labels and a price change. */
const VARIANTS = [
  { label: 'Organic', priceFactor: 1.35, blurb: 'Certified organic.' },
  { label: 'Farmhouse', priceFactor: 1.2, blurb: 'From small farms.' },
  { label: 'Everyday', priceFactor: 0.85, blurb: 'Our best-value pick.' },
  { label: 'Premium', priceFactor: 1.5, blurb: 'The best of the range.' },
] as const;

function dietsFor(allergens: readonly Allergen[], flag: BaseFlag | undefined): Diet[] {
  const diets = new Set<Diet>();
  if (flag !== 'meat') diets.add('VEGETARIAN');
  if (flag === undefined && !allergens.includes('DAIRY') && !allergens.includes('EGGS')) {
    diets.add('VEGAN');
  }
  if (!allergens.includes('GLUTEN')) diets.add('GLUTEN_FREE');
  if (!allergens.includes('DAIRY')) diets.add('DAIRY_FREE');
  return DIETS.filter((diet) => diets.has(diet));
}

function imageUrl(id: string): string {
  // Placeholder photos. The seed in the URL keeps the same picture for the same item.
  return `https://picsum.photos/seed/pantry-${id}/600/400`;
}

/** Shop-style price: round to 10 cents, then end in 9. */
function shelfPrice(cents: number): number {
  return Math.max(49, Math.round(cents / 10) * 10 - 1);
}

function generateProducts(rng: () => number): SeedProduct[] {
  const products: SeedProduct[] = [];
  const add = (
    name: string,
    blurb: string,
    priceCents: number,
    category: Category,
    [, , unit, allergens = [], flag]: BaseProduct,
  ) => {
    const id = `p${products.length + 1}`;
    products.push({
      id,
      name,
      description: `${blurb} ${CATEGORY_BLURB[category]}`,
      imageUrl: imageUrl(id),
      priceCents,
      unit,
      category,
      diets: dietsFor(allergens, flag),
      allergens: ALLERGENS.filter((allergen) => allergens.includes(allergen)),
      inStock: rng() < 0.95,
    });
  };

  for (const category of Object.keys(BASE_PRODUCTS) as Category[]) {
    for (const base of BASE_PRODUCTS[category]) {
      const [name, priceCents, unit] = base;
      add(name, `${name}, ${unit}.`, priceCents, category, base);
      const variant = pick(rng, VARIANTS);
      add(
        `${variant.label} ${name}`,
        `${name}, ${unit}. ${variant.blurb}`,
        shelfPrice(priceCents * variant.priceFactor),
        category,
        base,
      );
    }
  }
  return products;
}

// ---------------------------------------------------------------------------
// Recipes
// ---------------------------------------------------------------------------

type Method = 'pot' | 'pan' | 'oven' | 'bowl';

interface RecipeTemplate {
  name: string;
  /** Names of base products (the plain version is used). */
  ingredients: readonly string[];
  cookTimeMin: number;
  method: Method;
  sweet?: boolean;
}

const RECIPE_TEMPLATES: readonly RecipeTemplate[] = [
  {
    name: 'Tomato Basil Spaghetti',
    ingredients: ['Spaghetti', 'Chopped Tomatoes', 'Basil', 'Garlic', 'Olive Oil', 'Parmesan'],
    cookTimeMin: 20,
    method: 'pot',
  },
  {
    name: 'Creamy Mushroom Risotto',
    ingredients: ['Risotto Rice', 'Mushrooms', 'Onions', 'Vegetable Stock', 'Parmesan', 'Butter'],
    cookTimeMin: 35,
    method: 'pot',
  },
  {
    name: 'Chickpea Coconut Curry',
    ingredients: ['Chickpeas', 'Coconut Milk', 'Curry Paste', 'Onions', 'Spinach', 'Basmati Rice'],
    cookTimeMin: 30,
    method: 'pot',
  },
  {
    name: 'Lemon Garlic Salmon',
    ingredients: ['Salmon Fillet', 'Lemons', 'Garlic', 'Broccoli', 'Olive Oil', 'Potatoes'],
    cookTimeMin: 25,
    method: 'oven',
  },
  {
    name: 'Chicken Fajita Wraps',
    ingredients: ['Chicken Breast', 'Bell Pepper', 'Onions', 'Tortilla Wraps', 'Paprika', 'Avocado'],
    cookTimeMin: 25,
    method: 'pan',
  },
  {
    name: 'Beef Chili',
    ingredients: ['Beef Mince', 'Black Beans', 'Chopped Tomatoes', 'Onions', 'Cumin', 'Basmati Rice'],
    cookTimeMin: 45,
    method: 'pot',
  },
  {
    name: 'Veggie Stir-Fry Noodles',
    ingredients: ['Rice Noodles', 'Broccoli', 'Carrots', 'Bell Pepper', 'Soy Sauce', 'Ginger'],
    cookTimeMin: 20,
    method: 'pan',
  },
  {
    name: 'Red Lentil Soup',
    ingredients: ['Red Lentils', 'Carrots', 'Onions', 'Vegetable Stock', 'Cumin', 'Lemons'],
    cookTimeMin: 30,
    method: 'pot',
  },
  {
    name: 'Greek Salad Bowl',
    ingredients: ['Cucumber', 'Tomatoes', 'Feta', 'Onions', 'Olive Oil', 'Pita Bread'],
    cookTimeMin: 10,
    method: 'bowl',
  },
  {
    name: 'Garlic Prawn Spaghetti',
    ingredients: ['Prawns', 'Spaghetti', 'Garlic', 'Chili Flakes', 'Olive Oil', 'Lemons'],
    cookTimeMin: 20,
    method: 'pan',
  },
  {
    name: 'Tofu Peanut Noodles',
    ingredients: ['Smoked Tofu', 'Rice Noodles', 'Peanut Butter', 'Soy Sauce', 'Carrots', 'Coriander'],
    cookTimeMin: 20,
    method: 'pan',
  },
  {
    name: 'Sausage Tray Bake',
    ingredients: ['Pork Sausages', 'Potatoes', 'Onions', 'Bell Pepper', 'Olive Oil', 'Paprika'],
    cookTimeMin: 40,
    method: 'oven',
  },
  {
    name: 'Halloumi Couscous Bowl',
    ingredients: ['Halloumi', 'Couscous', 'Zucchini', 'Tomatoes', 'Lemons', 'Olive Oil'],
    cookTimeMin: 20,
    method: 'pan',
  },
  {
    name: 'Sweet Potato Black Bean Tacos',
    ingredients: ['Sweet Potatoes', 'Black Beans', 'Tortilla Wraps', 'Avocado', 'Coriander', 'Cumin'],
    cookTimeMin: 30,
    method: 'oven',
  },
  {
    name: 'Pesto Chicken Penne',
    ingredients: ['Chicken Breast', 'Penne', 'Pesto', 'Spinach', 'Parmesan'],
    cookTimeMin: 25,
    method: 'pot',
  },
  {
    name: 'Cod with Peas and Potatoes',
    ingredients: ['Cod Fillet', 'Frozen Peas', 'Potatoes', 'Butter', 'Lemons'],
    cookTimeMin: 30,
    method: 'oven',
  },
  {
    name: 'Mushroom Omelette',
    ingredients: ['Eggs', 'Mushrooms', 'Cheddar', 'Butter', 'Spinach'],
    cookTimeMin: 10,
    method: 'pan',
  },
  {
    name: 'Quinoa Power Bowl',
    ingredients: ['Quinoa', 'Chickpeas', 'Avocado', 'Spinach', 'Tahini', 'Lemons'],
    cookTimeMin: 20,
    method: 'bowl',
  },
  {
    name: 'Turkey Burgers',
    ingredients: ['Turkey Mince', 'Burger Buns', 'Tomatoes', 'Onions', 'Cheddar'],
    cookTimeMin: 25,
    method: 'pan',
  },
  {
    name: 'Margherita Flatbread',
    ingredients: ['Naan', 'Mozzarella', 'Chopped Tomatoes', 'Basil', 'Olive Oil'],
    cookTimeMin: 15,
    method: 'oven',
  },
  {
    name: 'Egg Fried Rice',
    ingredients: ['Basmati Rice', 'Eggs', 'Frozen Peas', 'Soy Sauce', 'Sesame Oil', 'Carrots'],
    cookTimeMin: 15,
    method: 'pan',
  },
  {
    name: 'Steak with Garlic Potatoes',
    ingredients: ['Beef Steak', 'Potatoes', 'Garlic', 'Butter', 'Broccoli'],
    cookTimeMin: 30,
    method: 'pan',
  },
  {
    name: 'Banana Oat Pancakes',
    ingredients: ['Bananas', 'Rolled Oats', 'Eggs', 'Whole Milk', 'Honey', 'Blueberries'],
    cookTimeMin: 15,
    method: 'pan',
    sweet: true,
  },
  {
    name: 'Berry Yogurt Bowl',
    ingredients: ['Greek Yogurt', 'Frozen Berries', 'Rolled Oats', 'Honey', 'Walnuts'],
    cookTimeMin: 5,
    method: 'bowl',
    sweet: true,
  },
  {
    name: 'Tuna Steak Rice Bowl',
    ingredients: ['Tuna Steak', 'Basmati Rice', 'Frozen Edamame', 'Soy Sauce', 'Sesame Oil', 'Cucumber'],
    cookTimeMin: 20,
    method: 'pan',
  },
  {
    name: 'Spinach Feta Pita',
    ingredients: ['Pita Bread', 'Frozen Spinach', 'Feta', 'Garlic', 'Olive Oil'],
    cookTimeMin: 15,
    method: 'oven',
  },
  {
    name: 'Coconut Lentil Dal',
    ingredients: ['Red Lentils', 'Coconut Milk', 'Curry Paste', 'Ginger', 'Garlic', 'Basmati Rice'],
    cookTimeMin: 35,
    method: 'pot',
  },
  {
    name: 'Bacon Carbonara',
    ingredients: ['Spaghetti', 'Bacon', 'Eggs', 'Parmesan', 'Garlic'],
    cookTimeMin: 20,
    method: 'pot',
  },
  {
    name: 'Roasted Vegetable Couscous',
    ingredients: ['Couscous', 'Zucchini', 'Bell Pepper', 'Onions', 'Olive Oil', 'Hummus'],
    cookTimeMin: 30,
    method: 'oven',
  },
  {
    name: 'Chicken Thigh Curry',
    ingredients: ['Chicken Thighs', 'Coconut Milk', 'Curry Paste', 'Onions', 'Basmati Rice', 'Coriander'],
    cookTimeMin: 40,
    method: 'pot',
  },
];

/** Every template also gets a second recipe with one extra ingredient. */
const SAVOURY_EXTRAS = ['Spinach', 'Chili Flakes', 'Mushrooms', 'Bell Pepper', 'Coriander', 'Tomatoes'];
const SWEET_EXTRAS = ['Bananas', 'Blueberries', 'Walnuts', 'Peanut Butter'];

const QUANTITIES: Record<Category, readonly string[]> = {
  PRODUCE: ['1 pc', '2 pcs', '150 g', '200 g', 'a handful'],
  DAIRY_AND_EGGS: ['50 g', '100 g', '150 g', '2 tbsp'],
  MEAT_AND_FISH: ['300 g', '400 g', '500 g'],
  BAKERY: ['2 pcs', '4 pcs'],
  PANTRY: ['1 tsp', '1 tbsp', '2 tbsp'],
  FROZEN: ['150 g', '200 g'],
  DRINKS: ['100 ml', '200 ml'],
  SNACKS: ['30 g', '50 g', '2 tbsp'],
};

/** Pasta, rice and tins are used by weight; oils, pastes and spices by the spoon. */
function quantityFor(rng: () => number, product: SeedProduct): string {
  if (product.category === 'PANTRY' && /^(400|500) g$|^1 kg$/.test(product.unit)) {
    return pick(rng, ['200 g', '250 g', '300 g']);
  }
  if (product.category === 'PANTRY' && product.unit === '400 ml') return pick(rng, ['200 ml', '400 ml']);
  return pick(rng, QUANTITIES[product.category]);
}

function list(names: readonly string[]): string {
  const lower = names.map((name) => name.toLowerCase());
  const last = lower.pop();
  return lower.length > 0 ? `${lower.join(', ')} and ${last}` : `${last}`;
}

function stepsFor(method: Method, ingredients: readonly string[], cookTimeMin: number): string[] {
  const [main = '', second = '', ...rest] = ingredients;
  const prep = `Get everything ready: ${list(ingredients)}.`;
  const serve = 'Taste, season with salt and pepper, and serve.';
  const cookTime = Math.max(3, cookTimeMin - 8);
  switch (method) {
    case 'pot':
      return [
        prep,
        `Soften the ${list(rest.length > 0 ? rest : [second])} in a large pot over a medium heat.`,
        `Add the ${list([main, second])} and simmer for ${cookTime} minutes, stirring now and then.`,
        serve,
      ];
    case 'pan':
      return [
        prep,
        `Heat a large pan and cook the ${main.toLowerCase()} until golden.`,
        `Add the ${list([second, ...rest])} and cook for ${cookTime} minutes.`,
        serve,
      ];
    case 'oven':
      return [
        `Heat the oven to 200°C. ${prep}`,
        `Spread the ${list([main, second])} on a tray and add the ${list(rest.length > 0 ? rest : [second])}.`,
        `Roast for ${cookTime} minutes, turning once.`,
        serve,
      ];
    case 'bowl':
      return [prep, `Chop what needs chopping and combine the ${list(ingredients)} in a bowl.`, serve];
  }
}

function generateRecipes(rng: () => number, products: readonly SeedProduct[]): SeedRecipe[] {
  const byName = new Map(products.map((product) => [product.name, product]));
  const productFor = (name: string): SeedProduct => {
    const product = byName.get(name);
    if (!product) throw new Error(`Recipe ingredient "${name}" is not a product`);
    return product;
  };

  const recipes: SeedRecipe[] = [];
  const add = (
    name: string,
    template: RecipeTemplate,
    ingredientNames: readonly string[],
    servings: number,
    cookTimeMin: number,
  ) => {
    const id = `r${recipes.length + 1}`;
    const used = ingredientNames.map(productFor);
    recipes.push({
      id,
      name,
      description: `${name} for ${servings}, ready in ${cookTimeMin} minutes. Made with ${list(
        ingredientNames.slice(0, 3),
      )}.`,
      imageUrl: imageUrl(id),
      cookTimeMin,
      servings,
      // A recipe has a diet only if every ingredient has it; it has an allergen if any ingredient has it.
      diets: DIETS.filter((diet) => used.every((product) => product.diets.includes(diet))),
      allergens: ALLERGENS.filter((allergen) =>
        used.some((product) => product.allergens.includes(allergen)),
      ),
      ingredients: used.map((product) => ({
        productId: product.id,
        quantity: quantityFor(rng, product),
      })),
      steps: stepsFor(template.method, ingredientNames, cookTimeMin),
      priceCents: used.reduce((sum, product) => sum + product.priceCents, 0),
    });
  };

  for (const template of RECIPE_TEMPLATES) {
    add(template.name, template, template.ingredients, pick(rng, [2, 4]), template.cookTimeMin);

    const extras = (template.sweet ? SWEET_EXTRAS : SAVOURY_EXTRAS).filter(
      (extra) => !template.ingredients.includes(extra),
    );
    const extra = pick(rng, extras);
    const name =
      extra === 'Chili Flakes' ? `Spicy ${template.name}` : `${template.name} with ${extra}`;
    add(
      name,
      template,
      [...template.ingredients, extra],
      pick(rng, [2, 4, 6]),
      template.cookTimeMin + pick(rng, [0, 5, 10]),
    );
  }
  return recipes;
}

export interface SeedCatalog {
  products: SeedProduct[];
  recipes: SeedRecipe[];
}

export function generateSeed(seed: number): SeedCatalog {
  const rng = createRng(seed);
  const products = generateProducts(rng);
  const recipes = generateRecipes(rng, products);
  return { products, recipes };
}
