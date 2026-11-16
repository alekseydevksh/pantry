/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.{ts,tsx}'],
  moduleNameMapper: {
    // Same alias as "paths" in tsconfig.json.
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  clearMocks: true,
};
