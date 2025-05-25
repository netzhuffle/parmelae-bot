import { GptModels } from '../GptModelsProvider.js';

/**
 * Fake implementation of Config for testing.
 */
export class ConfigFake {
  public gptModel = GptModels.Cheap;
  public identityByChatId = new Map();
  public readonly username = 'testbot';
  public readonly telegramToken = 'fake-telegram-token';
  public readonly openAiKey = 'fake-openai-key';
  public readonly heliconeApiKey = 'fake-helicone-key';
  public readonly sentryDsn = null;
  public readonly gitHubPersonalAccessToken = 'fake-github-token';
  public readonly serpApiApiKey = 'fake-serpapi-key';
  public readonly chatAllowlist = [BigInt(123), BigInt(456)];
  public readonly newCommitAnnouncementChats = [BigInt(789)];
}
