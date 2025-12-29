import assert from 'assert';
import { injectable } from 'inversify';
import { GptModel, GptModels } from './GptModelsProvider.js';
import { Identity } from './MessageGenerators/Identities/Identity.js';
import { normalizeUsername } from './BotIdentityContext.js';
import type {
  BotConfig,
  BotConfiguration,
  GitHubConfig,
} from './ConfigInterfaces.js';

/** The configuration options, taken from .env */
@injectable()
export class Config implements BotConfig, GitHubConfig {
  /** Which GPT language model to use for LangChain agent and tools. */
  public gptModel: GptModel = GptModels.Advanced;

  /** The identity to use to reply to messages for each chat. */
  public identityByChatId = new Map<bigint, Identity>();

  /** The primary bot configuration (reads messages). */
  public readonly primaryBot: BotConfiguration;

  /** All configured bots (includes primary bot as first element). */
  public readonly bots: readonly BotConfiguration[];

  /** The OpenAI API auth key. */
  public readonly openAiKey: string;

  /** The Helicone API auth key. */
  public readonly heliconeApiKey: string;

  /** The Sentry DSN (optional). */
  public readonly sentryDsn: string | null;

  /** The GitHub Personal Access Token. */
  public readonly gitHubPersonalAccessToken: string;

  /** The SerpAPI API key. */
  public readonly serpApiApiKey: string;

  /**
   * The allowlisted chats for GPT queries.
   *
   * Can be private chats, groups, supergroups, or channels.
   */
  public readonly chatAllowlist: readonly bigint[];

  /**
   * New Git commits are announced in these chats.
   *
   * Can be private chats, groups, supergroups, or channels.
   */
  public readonly newCommitAnnouncementChats: readonly bigint[];

  constructor() {
    // Parse bot configurations
    const bots = this.parseBotConfigurations();
    assert(bots.length > 0, 'At least one bot must be configured');
    this.bots = bots;
    this.primaryBot = bots[0];

    assert(Bun.env.OPENAI_API_KEY, 'You must define OPENAI_API_KEY in .env');
    this.openAiKey = Bun.env.OPENAI_API_KEY;

    assert(
      Bun.env.HELICONE_API_KEY,
      'You must define HELICONE_API_KEY in .env',
    );
    this.heliconeApiKey = Bun.env.HELICONE_API_KEY;

    this.sentryDsn = Bun.env.SENTRY_DSN ?? null;

    assert(
      Bun.env.GITHUB_PERSONAL_ACCESS_TOKEN,
      'You must define GIT_HUB_PERSONAL_ACCESS_TOKEN in.env',
    );
    this.gitHubPersonalAccessToken = Bun.env.GITHUB_PERSONAL_ACCESS_TOKEN;

    assert(Bun.env.SERPAPI_API_KEY, 'You must define SERPAPI_API_KEY in.env');
    this.serpApiApiKey = Bun.env.SERPAPI_API_KEY;

    assert(Bun.env.CHAT_ALLOWLIST, 'You must define CHAT_ALLOWLIST in .env');
    const chatAllowlistStrings = Bun.env.CHAT_ALLOWLIST.split(',');
    this.chatAllowlist = chatAllowlistStrings.map((n) => {
      try {
        return BigInt(n);
      } catch {
        assert(false, 'CHAT_ALLOWLIST must contain only numbers');
      }
    });

    assert(
      Bun.env.NEW_COMMITS_ANNOUNCEMENT_CHATS,
      'You must define NEW_COMMIT_ANNOUNCEMENT_CHATS in .env',
    );
    const newCommitAnnouncementChatStrings =
      Bun.env.NEW_COMMITS_ANNOUNCEMENT_CHATS.split(',');
    this.newCommitAnnouncementChats = newCommitAnnouncementChatStrings.map(
      (chat) => {
        try {
          return BigInt(chat);
        } catch {
          assert(
            false,
            'NEW_COMMIT_ANNOUNCEMENT_CHATS must contain only numbers',
          );
        }
      },
    );
  }

  /**
   * Parses bot configurations from environment variables.
   * Primary bot uses USERNAME, TELEGRAM_TOKEN, DEFAULT_IDENTITY.
   * Additional bots use USERNAME_2-9, TELEGRAM_TOKEN_2-9, DEFAULT_IDENTITY_2-9.
   *
   * @returns Array of bot configurations, with primary bot first
   * @throws {Error} If partial bot configurations are found or duplicate usernames exist
   */
  private parseBotConfigurations(): BotConfiguration[] {
    const bots: BotConfiguration[] = [];
    const seenUsernames = new Set<string>();

    // Parse primary bot (bot 1)
    const primaryUsername = Bun.env.USERNAME;
    const primaryToken = Bun.env.TELEGRAM_TOKEN;
    const primaryIdentity = Bun.env.DEFAULT_IDENTITY ?? null;

    if (primaryUsername && primaryToken) {
      const normalized = normalizeUsername(primaryUsername);
      assert(
        !seenUsernames.has(normalized),
        `Duplicate bot username: ${primaryUsername}`,
      );
      seenUsernames.add(normalized);
      bots.push({
        username: primaryUsername,
        telegramToken: primaryToken,
        defaultIdentity: primaryIdentity,
      });
    } else if (primaryUsername || primaryToken) {
      assert(
        false,
        'Primary bot requires both USERNAME and TELEGRAM_TOKEN to be set',
      );
    }

    // Parse additional bots (2-9)
    for (let i = 2; i <= 9; i++) {
      const username = Bun.env[`USERNAME_${i}`];
      const token = Bun.env[`TELEGRAM_TOKEN_${i}`];
      const identity = Bun.env[`DEFAULT_IDENTITY_${i}`] ?? null;

      if (username && token) {
        const normalized = normalizeUsername(username);
        assert(
          !seenUsernames.has(normalized),
          `Duplicate bot username: ${username}`,
        );
        seenUsernames.add(normalized);
        bots.push({
          username,
          telegramToken: token,
          defaultIdentity: identity,
        });
      } else if (username || token) {
        assert(
          false,
          `Bot ${i} requires both USERNAME_${i} and TELEGRAM_TOKEN_${i} to be set`,
        );
      }
    }

    return bots;
  }

  /**
   * Get bot configuration by username.
   *
   * @param username - Bot username (case-insensitive)
   * @returns Bot configuration or undefined if not found
   */
  getBotByUsername(username: string): BotConfiguration | undefined {
    const normalized = normalizeUsername(username);
    return this.bots.find(
      (bot) => normalizeUsername(bot.username) === normalized,
    );
  }
}
