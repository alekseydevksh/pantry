import productsJson from '../../../data/products.json';
import recipesJson from '../../../data/recipes.json';
import { generateSeed, SEED } from '../generate';
import { ALLERGENS, DIETS, seedProductsSchema, seedRecipesSchema } from '../schema';

describe('seed data', () => {
  const products = seedProductsSchema.parse(productsJson);
  const recipes = seedRecipesSchema.parse(recipesJson);
  const productsById = new Map(products.map((product) => [product.id, product]));

  it('has about 200 products and 60 recipes', () => {
    expect(products.length).toBeGreaterThanOrEqual(190);
    expect(products.length).toBeLessThanOrEqual(210);
    expect(recipes).toHaveLength(60);
  });

  it('has unique ids and names', () => {
    for (const items of [products, recipes]) {
      expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
      expect(new Set(items.map((item) => item.name)).size).toBe(items.length);
    }
  });

  it('is deterministic: the committed JSON is what the generator produces', () => {
    const first = generateSeed(SEED);
    const second = generateSeed(SEED);
    expect(second).toEqual(first);
    expect(first.products).toEqual(productsJson);
    expect(first.recipes).toEqual(recipesJson);
  });

  it('points every recipe ingredient to an existing product', () => {
    for (const recipe of recipes) {
      for (const ingredient of recipe.ingredients) {
        expect(productsById.has(ingredient.productId)).toBe(true);
      }
    }
  });

  it('derives recipe diets, allergens and price from the ingredients', () => {
    for (const recipe of recipes) {
      const used = recipe.ingredients.map((ingredient) => productsById.get(ingredient.productId)!);
      expect(recipe.allergens).toEqual(
        ALLERGENS.filter((allergen) =>
          used.some((product) => product.allergens.includes(allergen)),
        ),
      );
      expect(recipe.diets).toEqual(
        DIETS.filter((diet) => used.every((product) => product.diets.includes(diet))),
      );
      expect(recipe.priceCents).toBe(used.reduce((sum, product) => sum + product.priceCents, 0));
    }
  });

  it('never marks a product vegan when it contains dairy or eggs', () => {
    for (const product of products) {
      if (product.allergens.includes('DAIRY') || product.allergens.includes('EGGS')) {
        expect(product.diets).not.toContain('VEGAN');
      }
      if (product.diets.includes('VEGAN')) expect(product.diets).toContain('VEGETARIAN');
    }
  });

  it('covers every diet and allergen, so each filter has something to find', () => {
    for (const diet of DIETS) {
      expect(recipes.some((recipe) => recipe.diets.includes(diet))).toBe(true);
    }
    for (const allergen of ALLERGENS) {
      expect(products.some((product) => product.allergens.includes(allergen))).toBe(true);
    }
  });
});
