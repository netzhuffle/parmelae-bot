import { AIMessage } from '@langchain/core/messages';
import { DallEPromptGenerator } from './DallEPromptGenerator.js';
import { GptModelsProvider } from '../GptModelsProvider.js';
import { ChatOpenAI } from '@langchain/openai';
import { ChatOpenAiFake } from '../Fakes/ChatOpenAiFake.js';
import { ChatGptService } from '../ChatGptService.js';
import { OpenAIEmbeddings } from '@langchain/openai';

test('generate', async () => {
  const chatOpenAiFake = new ChatOpenAiFake(
    new AIMessage('DALL-E description'),
  );
  const sut = new DallEPromptGenerator(
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

  const response = await sut.generate('image description');

  expect(response).toEqual('DALL-E description');
  expect(chatOpenAiFake.request).toHaveLength(6);
  expect(chatOpenAiFake.request?.[5].text).toBe('image description');
});
