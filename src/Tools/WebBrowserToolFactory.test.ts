import { describe, test, expect, expectTypeOf, beforeEach } from 'bun:test';
import container from '../inversify.config.js';
import { WebBrowserToolFactory } from './WebBrowserToolFactory.js';

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

  test('should create WebBrowser tool without throwing cheerio error', () => {
    // This test should reproduce the cheerio dependency error
    // if cheerio is not installed
    expect(() => {
      const tool = factory.create();
      expect(tool).toBeDefined();
      expectTypeOf(tool.invoke).toBeFunction();
      expect(tool.name).toBe('web-browser');
    }).not.toThrow();
  });

  test('should be able to initialize WebBrowser tool internals without cheerio errors', () => {
    // This test tries to trigger the internal initialization that might require cheerio
    const tool = factory.create();

    // Try to access properties that might trigger cheerio loading
    expect(tool.description).toBeDefined();
    expect(tool.name).toBe('web-browser');

    // Note: We don't actually call the tool with a URL as that would require
    // a real HTTP request and the cheerio parsing, but this tests the basic
    // initialization path
  });

  test('should have proper tool description', () => {
    const tool = factory.create();
    expect(tool.description).toContain(
      'useful for when you need to find something on or summarize a webpage',
    );
  });
});
