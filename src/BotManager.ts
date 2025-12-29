import { injectable, inject } from 'inversify';
import type { BotConfig } from './ConfigInterfaces.js';
import { Config } from './Config.js';
import { Telegraf } from 'telegraf';
import { normalizeUsername } from './BotIdentityContext.js';
import assert from 'node:assert/strict';

/**
 * Manages multiple Telegraf bot instances.
 *
 * The primary bot is used for reading messages (polling).
 * Additional bots are send-only (not launched, used only for outbound API calls).
 */
@injectable()
export class BotManager {
  private readonly bots: Map<string, Telegraf>;
  private readonly primaryBot: Telegraf;

  constructor(@inject(Config) private readonly config: BotConfig) {
    this.bots = new Map();

    // Create Telegraf instance for each configured bot
    for (const botConfig of config.bots) {
      const telegraf = new Telegraf(botConfig.telegramToken);
      const normalizedUsername = normalizeUsername(botConfig.username);
      this.bots.set(normalizedUsername, telegraf);
    }

    // Primary bot is always bots[0], so it must exist in the map
    const primaryNormalized = normalizeUsername(config.primaryBot.username);
    const primary = this.bots.get(primaryNormalized);
    assert(
      primary,
      `Primary bot "${config.primaryBot.username}" must exist in bots map (invariant violation)`,
    );
    this.primaryBot = primary;
  }

  /**
   * Get Telegraf instance for a specific bot by username.
   * Used for sending messages as a specific bot identity.
   *
   * **Precondition:** The username must belong to a configured bot.
   * Use `isConfiguredBot()` or `config.getBotByUsername()` to validate before calling.
   *
   * @param username - Bot username (case-insensitive)
   * @returns Telegraf instance for the bot
   */
  getBot(username: string): Telegraf {
    const normalized = normalizeUsername(username);
    const bot = this.bots.get(normalized);
    assert(
      bot,
      `Bot with username "${username}" must be configured (use isConfiguredBot() to check first)`,
    );
    return bot;
  }

  /**
   * Get the primary bot's Telegraf instance.
   * This is the bot that reads and processes incoming messages.
   * Only this bot should have `.launch()` called on it.
   */
  getPrimaryBot(): Telegraf {
    return this.primaryBot;
  }

  /**
   * Get all Telegraf instances (primary + additional bots).
   */
  getAllBots(): Telegraf[] {
    return Array.from(this.bots.values());
  }

  /**
   * Get all bot usernames in normalized form (lowercase).
   *
   * Returns the normalized form used for internal lookups.
   * For original usernames with original casing, use `config.bots.map(b => b.username)`.
   *
   * @returns Array of normalized bot usernames
   */
  getNormalizedBotUsernames(): string[] {
    return Array.from(this.bots.keys());
  }

  /**
   * Check if a username belongs to a configured bot.
   */
  isConfiguredBot(username: string): boolean {
    return this.bots.has(normalizeUsername(username));
  }
}
