import '@abraham/reflection';
import { test, expect } from 'bun:test';
import { AIChatMessage } from 'langchain/schema';
import { GptModelsProvider } from '../GptModelsProvider';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { GitCommitAnnouncementGenerator } from './GitCommitAnnouncementGenerator';
import { ChatOpenAiFake } from '../Fakes/ChatOpenAiFake';
import { ChatGptService } from '../ChatGptService';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';

test('generate', async () => {
  const chatOpenAiFake = new ChatOpenAiFake(
    new AIChatMessage('Commit Description'),
  );
  const sut = new GitCommitAnnouncementGenerator(
    new ChatGptService(
      new GptModelsProvider({
        chatGpt: chatOpenAiFake as unknown as ChatOpenAI,
        chatGptStrict: undefined as unknown as ChatOpenAI,
        gpt4: undefined as unknown as ChatOpenAI,
        gpt4Strict: undefined as unknown as ChatOpenAI,
        embeddings: undefined as unknown as OpenAIEmbeddings,
      }),
    ),
  );

  const response = await sut.generate('git commit message');

  expect(response).toEqual('Commit Description');
  expect(chatOpenAiFake.request).toHaveLength(12);
  expect(chatOpenAiFake.request?.[11].text).toBe('git commit message');
});
