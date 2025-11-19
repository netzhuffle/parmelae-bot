import { describe, test, expect, expectTypeOf, beforeEach } from 'bun:test';
import container from '../inversify.config.js';
import { WebBrowserToolFactory } from './WebBrowserToolFactory.js';
import packageJson from '../../package.json' with { type: 'json' };

describe('WebBrowserToolFactory', () => {
  let factory: WebBrowserToolFactory;

  beforeEach(() => {
    // Mock required environment variables for DI container resolution
    Bun.env.USERNAME = 'test-bot';
    Bun.env.TELEGRAM_TOKEN = 'test-token';
    Bun.env.OPENAI_API_KEY = 'test-openai-key';
    Bun.env.HELICONE_API_KEY = 'test-helicone-key';
    Bun.env.GITHUB_PERSONAL_ACCESS_TOKEN = 'test-github-token';
    Bun.env.SERPAPI_API_KEY = 'test-serpapi-key';
    Bun.env.CHAT_ALLOWLIST = '123456789';
    Bun.env.NEW_COMMITS_ANNOUNCEMENT_CHATS = '123456789';

    factory = container.get<WebBrowserToolFactory>(WebBrowserToolFactory);
  });

  test('should resolve WebBrowserToolFactory from container', () => {
    expect(factory).toBeDefined();
    expect(factory).toBeInstanceOf(WebBrowserToolFactory);
  });

  test('should have cheerio declared in package.json (required dependency for WebBrowser tool)', () => {
    // The WebBrowser tool from @langchain/classic requires cheerio as a peer dependency
    // This test verifies that cheerio is properly declared in package.json dependencies
    // (not devDependencies, as it's needed at runtime)
    const dependencies = packageJson.dependencies ?? {};
    const hasCheerio = 'cheerio' in dependencies;

    if (!hasCheerio) {
      throw new Error(
        'cheerio is not declared in package.json dependencies. The WebBrowser tool requires cheerio as a peer dependency. ' +
          'Add it with: bun add cheerio',
      );
    }

    expect(hasCheerio).toBe(true);
  });

  test('should have cheerio installed and importable (required dependency for WebBrowser tool)', async () => {
    // Verify that cheerio can actually be imported at runtime
    let cheerioModule: unknown;
    try {
      // Try to dynamically import cheerio to verify it's available
      cheerioModule = await import('cheerio');
    } catch {
      throw new Error(
        'cheerio is not installed. The WebBrowser tool requires cheerio as a peer dependency. ' +
          'Install it with: bun add cheerio',
      );
    }

    // Verify cheerio module is actually loaded
    expect(cheerioModule).toBeDefined();
    expect(typeof cheerioModule).toBe('object');
    expect(cheerioModule).not.toBeNull();

    // Cheerio exports a default function (load) or named exports
    // Verify the module has the expected structure
    const module = cheerioModule as Record<string, unknown>;
    const hasDefaultExport =
      'default' in module && typeof module.default === 'function';
    const hasLoadExport = 'load' in module && typeof module.load === 'function';

    expect(hasDefaultExport || hasLoadExport).toBe(true);
  });

  test('should create WebBrowser tool without throwing errors', () => {
    const tool = factory.create();
    expect(tool).toBeDefined();
    expectTypeOf(tool.invoke).toBeFunction();
    expect(tool.name).toBe('web-browser');
  });

  test('should be able to initialize WebBrowser tool internals', () => {
    const tool = factory.create();

    // Verify tool properties are accessible
    expect(tool.description).toBeDefined();
    expect(tool.name).toBe('web-browser');
  });

  test('should have proper tool description', () => {
    const tool = factory.create();
    expect(tool.description).toContain(
      'useful for when you need to find something on or summarize a webpage',
    );
  });
});
