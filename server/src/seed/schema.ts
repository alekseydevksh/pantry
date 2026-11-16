import { z } from 'zod';

// Enum values mirror packages/shared/schema.graphql. The server typecheck compares them with the
// generated GraphQL types once codegen exists (task 0.6).
export const DIETS = ['VEGETARIAN', 'VEGAN', 'GLUTEN_FREE', 'DAIRY_FREE'] as const;
export const ALLERGENS = [
  'GLUTEN',
  'DAIRY',
  'EGGS',
  'NUTS',
  'PEANUTS',
  'SOY',
  'FISH',
  'SHELLFISH',
  'SESAME',
] as const;
export const CATEGORIES = [
  'PRODUCE',
  'DAIRY_AND_EGGS',
  'MEAT_AND_FISH',
  'BAKERY',
  'PANTRY',
  'FROZEN',
  'DRINKS',
  'SNACKS',
] as const;

export const dietSchema = z.enum(DIETS);
export const allergenSchema = z.enum(ALLERGENS);
export const categorySchema = z.enum(CATEGORIES);

export const seedProductSchema = z.strictObject({
  id: z.string().regex(/^p\d+$/),
  name: z.string().min(1),
  description: z.string().min(1),
  imageUrl: z.url(),
  priceCents: z.int().positive(),
  unit: z.string().min(1),
  category: categorySchema,
  diets: z.array(dietSchema),
  allergens: z.array(allergenSchema),
  inStock: z.boolean(),
});

export const seedRecipeSchema = z.strictObject({
  id: z.string().regex(/^r\d+$/),
  name: z.string().min(1),
  description: z.string().min(1),
  imageUrl: z.url(),
  cookTimeMin: z.int().positive(),
  servings: z.int().positive(),
  diets: z.array(dietSchema),
  allergens: z.array(allergenSchema),
  ingredients: z
    .array(z.strictObject({ productId: z.string(), quantity: z.string().min(1) }))
    .min(2),
  steps: z.array(z.string().min(1)).min(2),
  priceCents: z.int().positive(),
});

export const seedProductsSchema = z.array(seedProductSchema);
export const seedRecipesSchema = z.array(seedRecipeSchema);

export type Diet = z.infer<typeof dietSchema>;
export type Allergen = z.infer<typeof allergenSchema>;
export type Category = z.infer<typeof categorySchema>;
export type SeedProduct = z.infer<typeof seedProductSchema>;
export type SeedRecipe = z.infer<typeof seedRecipeSchema>;
