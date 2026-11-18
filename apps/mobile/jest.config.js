// jest-expo's own list of packages that are published as ES modules or untranspiled and must go
// through Babel. MSW 3 and its dependencies are ES modules only, and Jest runs CommonJS.
const expoPreset = require('jest-expo/jest-preset');

const MSW_PACKAGES = [
  ...['msw', '@msw', '@mswjs', '@open-draft', 'rettime', 'until-async', 'outvariant'],
  ...['cookie', 'tough-cookie', 'tldts', 'headers-polyfill', 'is-node-process'],
];

/** Adds `packages` to the "do not ignore" list of the preset's first pattern. */
function transformAlso(patterns, packages) {
  const [first, ...rest] = patterns;
  if (!first?.includes('(?!(')) throw new Error('jest-expo changed its transformIgnorePatterns');
  return [first.replace('(?!(', `(?!(${packages.join('|')}|`), ...rest];
}

// Some of those packages ship `.mjs` files, which the preset's Babel transform does not match
// (it handles `.js`, `.jsx`, `.ts`, `.tsx`). Same transformer, one more extension.
const babelTransform = expoPreset.transform['\\.[jt]sx?$'];

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  // jest-expo's environment, with Node's `fetch` kept for MSW (see jest/environment.js).
  testEnvironment: '<rootDir>/jest/environment.js',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.{ts,tsx}'],
  transform: { ...expoPreset.transform, '\\.mjs$': babelTransform },
  transformIgnorePatterns: transformAlso(expoPreset.transformIgnorePatterns, MSW_PACKAGES),
  moduleNameMapper: {
    // Same alias as "paths" in tsconfig.json.
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  clearMocks: true,
};
