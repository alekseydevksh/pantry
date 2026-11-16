// Writes the seed catalog to server/data. Run with `pnpm --filter @pantry/server seed`.
// The output is committed. The generator is deterministic, so a second run changes nothing.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { generateSeed, SEED } from '../src/seed/generate';

const dataDir = join(__dirname, '..', 'data');
const { products, recipes } = generateSeed(SEED);

mkdirSync(dataDir, { recursive: true });
writeFileSync(join(dataDir, 'products.json'), JSON.stringify(products, null, 2) + '\n');
writeFileSync(join(dataDir, 'recipes.json'), JSON.stringify(recipes, null, 2) + '\n');

console.log(`Wrote ${products.length} products and ${recipes.length} recipes to ${dataDir}`);
