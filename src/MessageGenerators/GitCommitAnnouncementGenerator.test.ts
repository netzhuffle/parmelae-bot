import { test, expect } from 'bun:test';
import { AIMessage } from '@langchain/core/messages';
import { GptModelsProvider } from '../GptModelsProvider.js';
import { ChatOpenAI } from '@langchain/openai';
import { GitCommitAnnouncementGenerator } from './GitCommitAnnouncementGenerator.js';
import { ChatOpenAiFake } from '../Fakes/ChatOpenAiFake.js';
import { ChatGptService } from '../ChatGptService.js';
import { OpenAIEmbeddings } from '@langchain/openai';

test('generate', async () => {
  const chatOpenAiFake = new ChatOpenAiFake(
    new AIMessage('Commit Description'),
  );
  const sut = new GitCommitAnnouncementGenerator(
    new ChatGptService(
      new GptModelsProvider({
        cheap: chatOpenAiFake as unknown as ChatOpenAI,
        advanced: undefined as unknown as ChatOpenAI,
        embeddings: undefined as unknown as OpenAIEmbeddings,
      }),
    ),
  );

  const response = await sut.generate('git commit message');

  expect(response).toBe('Commit Description');
  expect(chatOpenAiFake.request).toHaveLength(12);
  expect(chatOpenAiFake.request?.[11].text).toBe('git commit message');
});
