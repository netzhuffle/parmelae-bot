import { GptModels } from '../GptModelsProvider.js';
import { normalizeUsername } from '../BotIdentityContext.js';
import type {
  BotConfig,
  BotConfiguration,
  GitHubConfig,
} from '../ConfigInterfaces.js';

/**
 * Fake implementation of Config for testing.
 *
 * Implements narrow interfaces (BotConfig, GitHubConfig) to avoid type casts
 * and improve type safety in tests.
 */
export class ConfigFake implements BotConfig, GitHubConfig {
  public gptModel = GptModels.Cheap;
  public identityByChatId = new Map();
  public readonly primaryBot: BotConfiguration = {
    username: 'testbot',
    telegramToken: 'fake-telegram-token',
    defaultIdentity: null,
  };
  public readonly bots: readonly BotConfiguration[] = [this.primaryBot];
  public readonly openAiKey = 'fake-openai-key';
  public readonly heliconeApiKey = 'fake-helicone-key';
  public readonly sentryDsn = null;
  public readonly gitHubPersonalAccessToken = 'fake-github-token';
  public readonly serpApiApiKey = 'fake-serpapi-key';
  public readonly chatAllowlist = [BigInt(123), BigInt(456)];
  public readonly newCommitAnnouncementChats = [BigInt(789)];

  getBotByUsername(username: string): BotConfiguration | undefined {
    const normalized = normalizeUsername(username);
    return this.bots.find(
      (bot) => normalizeUsername(bot.username) === normalized,
    );
  }
}
