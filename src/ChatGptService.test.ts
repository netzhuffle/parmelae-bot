import { test, expect, describe } from 'bun:test';

import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import {
  AIMessagePromptTemplate,
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import { OpenAIEmbeddings } from '@langchain/openai';

import { ChatGptService } from './ChatGptService.js';
import { ChatOpenAiFake } from './Fakes/ChatOpenAiFake.js';
import { GptModels, GptModelsProvider } from './GptModelsProvider.js';
import { ChatGptRoles } from './MessageGenerators/ChatGptMessage.js';
import { StreamingTextSink } from './StreamingTextSink.js';

describe('ChatGptService', () => {
  test('generate message', async () => {
    const chatOpenAiFake = new ChatOpenAiFake(new AIMessage('completion'));
    const sut = new ChatGptService(
      new GptModelsProvider({
        cheap: chatOpenAiFake as unknown as ChatOpenAI,
        advanced: undefined as unknown as ChatOpenAI,
        embeddings: undefined as unknown as OpenAIEmbeddings,
      }),
    );
    const prompt = ChatPromptTemplate.fromMessages([
      SystemMessagePromptTemplate.fromTemplate('System Message'),
      AIMessagePromptTemplate.fromTemplate('Assistant Message'),
      HumanMessagePromptTemplate.fromTemplate('{text}'),
    ]);
    const response = await sut.generate(prompt, GptModels.Cheap, {
      text: 'User Message',
    });

    expect(response).toEqual({
      role: ChatGptRoles.Assistant,
      content: 'completion',
    });
    expect(chatOpenAiFake.request).toEqual([
      new SystemMessage('System Message'),
      new AIMessage('Assistant Message'),
      new HumanMessage('User Message'),
    ]);
  });

  test('streams generated text into the provided sink', async () => {
    const chatOpenAiFake = new ChatOpenAiFake(new AIMessage('completion'));
    const sink: StreamingTextSink = {
      appendText: async (text) => {
        streamedText.push(text);
      },
      reset: async () => {
        return;
      },
    };
    const streamedText: string[] = [];
    const sut = new ChatGptService(
      new GptModelsProvider({
        cheap: chatOpenAiFake as unknown as ChatOpenAI,
        advanced: undefined as unknown as ChatOpenAI,
        embeddings: undefined as unknown as OpenAIEmbeddings,
      }),
    );
    const prompt = ChatPromptTemplate.fromMessages([
      HumanMessagePromptTemplate.fromTemplate('{text}'),
    ]);

    const response = await sut.generate(
      prompt,
      GptModels.Cheap,
      {
        text: 'User Message',
      },
      sink,
    );

    expect(response.content).toBe('completion');
    expect(streamedText).toEqual(['completion']);
  });
});
