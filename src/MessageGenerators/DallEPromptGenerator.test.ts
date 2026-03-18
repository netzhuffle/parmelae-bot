import { test, expect } from 'bun:test';

import { AIMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { OpenAIEmbeddings } from '@langchain/openai';

import { ChatGptService } from '../ChatGptService.js';
import { ChatOpenAiFake } from '../Fakes/ChatOpenAiFake.js';
import { GptModelsProvider } from '../GptModelsProvider.js';
import { DallEPromptGenerator } from './DallEPromptGenerator.js';

test('generate', async () => {
  const chatOpenAiFake = new ChatOpenAiFake(new AIMessage('DALL-E description'));
  const sut = new DallEPromptGenerator(
    new ChatGptService(
      new GptModelsProvider({
        cheap: chatOpenAiFake as unknown as ChatOpenAI,
        advanced: undefined as unknown as ChatOpenAI,
        embeddings: undefined as unknown as OpenAIEmbeddings,
      }),
    ),
  );

  const response = await sut.generate('image description');

  expect(response).toBe('DALL-E description');
  expect(chatOpenAiFake.request).toHaveLength(6);
  expect(chatOpenAiFake.request?.[5].text).toBe('image description');
});
