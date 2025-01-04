import { dallETool } from './dallETool.js';
import { TelegramServiceFake } from '../Fakes/TelegramServiceFake.js';
import { DallEServiceFake } from '../Fakes/DallEServiceFake.js';
import { DallEPromptGenerator } from '../MessageGenerators/DallEPromptGenerator.js';
import { ChatGptService } from '../ChatGptService.js';
import { GptModelsProvider } from '../GptModelsProvider.js';
import { ChatOpenAiFake } from '../Fakes/ChatOpenAiFake.js';
import { AIMessage } from '@langchain/core/messages';
import { getContextVariable } from '@langchain/core/context';
import { OpenAIEmbeddings } from '@langchain/openai';
import { ChatOpenAI } from '@langchain/openai';

const TEST_CHAT_ID = '123456789';

jest.mock('@langchain/core/context', () => ({
  getContextVariable: jest.fn(),
}));

describe('dallETool', () => {
  let telegramFake: TelegramServiceFake;
  let dallEServiceFake: DallEServiceFake;
  let chatOpenAiFake: ChatOpenAiFake;
  let dallEPromptGenerator: DallEPromptGenerator;

  beforeEach(() => {
    telegramFake = new TelegramServiceFake();
    dallEServiceFake = new DallEServiceFake();
    chatOpenAiFake = new ChatOpenAiFake(
      new AIMessage('A professional photo of a hamster, ultra HD quality'),
    );
    dallEPromptGenerator = new DallEPromptGenerator(
      new ChatGptService(
        new GptModelsProvider({
          cheap: chatOpenAiFake as unknown as ChatOpenAI,
          cheapStrict: undefined as unknown as ChatOpenAI,
          advanced: undefined as unknown as ChatOpenAI,
          advancedStrict: undefined as unknown as ChatOpenAI,
          embeddings: undefined as unknown as OpenAIEmbeddings,
        }),
      ),
    );

    (getContextVariable as jest.Mock).mockImplementation((key: string) => {
      if (key === 'telegram') return telegramFake;
      if (key === 'chatId') return BigInt(TEST_CHAT_ID);
      if (key === 'dallE') return dallEServiceFake;
      if (key === 'dallEPromptGenerator') return dallEPromptGenerator;
      return undefined;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully generate and send an image', async () => {
    dallEServiceFake.result = { url: 'https://example.com/image.jpg' };

    const result = (await dallETool.invoke({
      prompt: 'Foto eines Hamsters',
    })) as string;

    expect(result).toBe(
      'Successfully sent the image to the Telegram chat: A professional photo of a hamster, ultra HD quality',
    );
    expect(dallEServiceFake.request?.prompt).toBe(
      'A professional photo of a hamster, ultra HD quality',
    );
    expect(telegramFake.request).toEqual({
      method: 'sendImage',
      url: 'https://example.com/image.jpg',
      caption: 'A professional photo of a hamster, ultra HD quality',
      chatId: TEST_CHAT_ID,
    });
  });

  it('should handle failed image generation', async () => {
    dallEServiceFake.result = { url: null };

    const result = (await dallETool.invoke({
      prompt: 'Foto eines Hamsters',
    })) as string;

    expect(result).toBe(
      'You could not send the image due to technical difficulties.',
    );
    expect(telegramFake.request).toBeUndefined();
  });
});
