/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ["**/?(*.)+(spec|test).ts"],
  transform: { '\\.[jt]s?$': ['ts-jest', { tsconfig: { allowJs: true } }] },
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.[jt]s$': '$1', },
};
