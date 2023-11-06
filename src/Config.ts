import * as dotenv from 'dotenv';
import assert from 'assert';
import { injectable } from 'inversify';
import { GptModel, GptModels } from './GptModelsProvider.js';

/** The configuration options, taken from .env */
@injectable()
export class Config {
  /** Which GPT language model to use for LangChain agent and tools. */
  public gptModel: GptModel = GptModels.Turbo;

  /** The bot's Telegram username (without @). */
  public readonly username: string;

  /** The Telegram API auth token. */
  public readonly telegramToken: string;

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
    dotenv.config();

    assert(process.env.USERNAME, 'You must define USERNAME in .env');
    this.username = process.env.USERNAME;

    assert(
      process.env.TELEGRAM_TOKEN,
      'You must define TELEGRAM_TOKEN in .env',
    );
    this.telegramToken = process.env.TELEGRAM_TOKEN;

    assert(
      process.env.OPENAI_API_KEY,
      'You must define OPENAI_API_KEY in .env',
    );
    this.openAiKey = process.env.OPENAI_API_KEY;

    assert(
      process.env.HELICONE_API_KEY,
      'You must define HELICONE_API_KEY in .env',
    );
    this.heliconeApiKey = process.env.HELICONE_API_KEY;

    this.sentryDsn = process.env.SENTRY_DSN ?? null;

    assert(
      process.env.GITHUB_PERSONAL_ACCESS_TOKEN,
      'You must define GIT_HUB_PERSONAL_ACCESS_TOKEN in.env',
    );
    this.gitHubPersonalAccessToken = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;

    assert(
      process.env.SERPAPI_API_KEY,
      'You must define SERPAPI_API_KEY in.env',
    );
    this.serpApiApiKey = process.env.SERPAPI_API_KEY;

    assert(
      process.env.CHAT_ALLOWLIST,
      'You must define CHAT_ALLOWLIST in .env',
    );
    const chatAllowlistStrings = process.env.CHAT_ALLOWLIST.split(',');
    this.chatAllowlist = chatAllowlistStrings.map((n) => {
      try {
        return BigInt(n);
      } catch (e) {
        assert(false, 'CHAT_ALLOWLIST must contain only numbers');
      }
    });

    assert(
      process.env.NEW_COMMITS_ANNOUNCEMENT_CHATS,
      'You must define NEW_COMMIT_ANNOUNCEMENT_CHATS in .env',
    );
    const newCommitAnnouncementChatStrings =
      process.env.NEW_COMMITS_ANNOUNCEMENT_CHATS.split(',');
    this.newCommitAnnouncementChats = newCommitAnnouncementChatStrings.map(
      (chat) => {
        try {
          return BigInt(chat);
        } catch (e) {
          assert(
            false,
            'NEW_COMMIT_ANNOUNCEMENT_CHATS must contain only numbers',
          );
        }
      },
    );
  }
}
