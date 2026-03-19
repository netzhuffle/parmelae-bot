import { test, expect } from 'bun:test';

import { AIMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { OpenAIEmbeddings } from '@langchain/openai';

import { ChatGptService } from '../ChatGptService.js';
import { ChatOpenAiFake } from '../Fakes/ChatOpenAiFake.js';
import { ConfigFake } from '../Fakes/ConfigFake.js';
import { GptModelsProvider } from '../GptModelsProvider.js';
import { OldMessageReplyGenerator } from './OldMessageReplyGenerator.js';

test('generate', async () => {
  const chatOpenAiFake = new ChatOpenAiFake(new AIMessage('Reply'));
  const sut = new OldMessageReplyGenerator(
    new ChatGptService(
      new GptModelsProvider({
        cheap: chatOpenAiFake as unknown as ChatOpenAI,
        advanced: chatOpenAiFake as unknown as ChatOpenAI,
        embeddings: undefined as unknown as OpenAIEmbeddings,
      }),
    ),
    new ConfigFake(),
  );

  const response = await sut.generate('old message');

  expect(response).toBe('Reply');
  expect(chatOpenAiFake.request).toHaveLength(16);
  expect(chatOpenAiFake.request?.[15].text).toBe('old message');
});
