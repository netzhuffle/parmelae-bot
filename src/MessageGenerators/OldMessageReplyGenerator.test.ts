import { AIMessage } from '@langchain/core/messages';
import { GptModelsProvider } from '../GptModelsProvider.js';
import { ChatOpenAI } from '@langchain/openai';
import { OldMessageReplyGenerator } from './OldMessageReplyGenerator.js';
import { ChatGptService } from '../ChatGptService.js';
import { ChatOpenAiFake } from '../Fakes/ChatOpenAiFake.js';
import { OpenAIEmbeddings } from '@langchain/openai';

test('generate', async () => {
  const chatOpenAiFake = new ChatOpenAiFake(new AIMessage('Reply'));
  const sut = new OldMessageReplyGenerator(
    new ChatGptService(
      new GptModelsProvider({
        turbo: chatOpenAiFake as unknown as ChatOpenAI,
        turboStrict: undefined as unknown as ChatOpenAI,
        gpt4Turbo: undefined as unknown as ChatOpenAI,
        gpt4TurboStrict: undefined as unknown as ChatOpenAI,
        embeddings: undefined as unknown as OpenAIEmbeddings,
      }),
    ),
  );

  const response = await sut.generate('old message');

  expect(response).toEqual('Reply');
  expect(chatOpenAiFake.request).toHaveLength(16);
  expect(chatOpenAiFake.request?.[15].text).toBe('old message');
});
