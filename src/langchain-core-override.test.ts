import { readFileSync } from 'fs';
import { describe, test, expect } from 'bun:test';
import packageJson from '../package.json' with { type: 'json' };

describe('LangChain Core Override Validation', () => {
  test('should ensure @langchain/core override version matches actually installed version', () => {
    const overrideVersion = packageJson.overrides?.['@langchain/core'];

    // Read bun.lock as text since it's JSONC (JSON with Comments), not pure JSON
    const bunLockContent = readFileSync('bun.lock', 'utf8');

    // Look for the @langchain/core package entry in bun.lock
    // Format is: "@langchain/core": ["@langchain/core@0.3.66", "", {...}, "sha512-..."]
    const langchainCoreMatch =
      /"@langchain\/core":\s*\[\s*"@langchain\/core@([^"]+)"/.exec(
        bunLockContent,
      );

    expect(overrideVersion).toBeDefined();
    expect(langchainCoreMatch).toBeDefined();

    if (!langchainCoreMatch || !overrideVersion) {
      throw new Error(
        'Could not find @langchain/core in either package.json overrides or bun.lock',
      );
    }

    // Extract the actual installed version from the regex match
    const actualVersion = langchainCoreMatch[1];

    expect(actualVersion).toBe(overrideVersion);
  });

  test('should have @langchain/core in package.json overrides section', () => {
    expect(packageJson.overrides).toBeDefined();
    expect(packageJson.overrides?.['@langchain/core']).toBeDefined();
    expect(typeof packageJson.overrides?.['@langchain/core']).toBe('string');
  });

  test('should have @langchain/core in dependencies', () => {
    expect(packageJson.dependencies).toBeDefined();
    expect(packageJson.dependencies?.['@langchain/core']).toBeDefined();
    expect(typeof packageJson.dependencies?.['@langchain/core']).toBe('string');
  });
});
