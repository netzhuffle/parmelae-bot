import { BotManager } from '../BotManager.js';
import type { BotConfig } from '../ConfigInterfaces.js';
import { Telegraf } from 'telegraf';
import { normalizeUsername } from '../BotIdentityContext.js';
import { TelegrafStub } from './TelegrafStub.js';
import assert from 'node:assert/strict';

/**
 * Fake implementation of BotManager for testing.
 *
 * Uses lightweight TelegrafStub instances instead of real Telegraf instances
 * for better test isolation and reduced coupling.
 */
export class BotManagerFake extends BotManager {
  private readonly fakeBots: Map<string, Telegraf>;
  private readonly fakePrimaryBot: Telegraf;

  constructor(config: BotConfig) {
    super(config);
    this.fakeBots = new Map();
    // Create lightweight stub instances for all bots
    for (const botConfig of config.bots) {
      const normalized = normalizeUsername(botConfig.username);
      // Use stub instead of real Telegraf for test isolation
      const stub = new TelegrafStub() as unknown as Telegraf;
      this.fakeBots.set(normalized, stub);
    }
    // Store primary bot reference
    const primaryNormalized = normalizeUsername(config.primaryBot.username);
    const primary = this.fakeBots.get(primaryNormalized);
    assert(
      primary,
      `Primary bot "${config.primaryBot.username}" must exist in bots map (invariant violation)`,
    );
    this.fakePrimaryBot = primary;
  }

  override getBot(username: string): Telegraf {
    const normalized = normalizeUsername(username);
    const bot = this.fakeBots.get(normalized);
    assert(
      bot,
      `Bot with username "${username}" must be configured (use isConfiguredBot() to check first)`,
    );
    return bot;
  }

  override getPrimaryBot(): Telegraf {
    return this.fakePrimaryBot;
  }

  override getAllBots(): Telegraf[] {
    return Array.from(this.fakeBots.values());
  }

  override getNormalizedBotUsernames(): string[] {
    return Array.from(this.fakeBots.keys());
  }

  override isConfiguredBot(username: string): boolean {
    return this.fakeBots.has(normalizeUsername(username));
  }
}
