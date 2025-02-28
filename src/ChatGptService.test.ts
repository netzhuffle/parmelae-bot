import { ChatGptService, UserMessagePromptTemplate } from './ChatGptService.js';
import { ChatGptRoles } from './MessageGenerators/ChatGptMessage.js';
import { GptModels, GptModelsProvider } from './GptModelsProvider.js';
import { ChatOpenAI } from '@langchain/openai';
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages';
import {
  AIMessagePromptTemplate,
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
} from '@langchain/core/prompts';
import { ChatOpenAiFake } from './Fakes/ChatOpenAiFake.js';
import { OpenAIEmbeddings } from '@langchain/openai';

test('generate message', async () => {
  const chatOpenAiFake = new ChatOpenAiFake(new AIMessage('completion'));
  const sut = new ChatGptService(
    new GptModelsProvider({
      cheap: chatOpenAiFake as unknown as ChatOpenAI,
      cheapStrict: undefined as unknown as ChatOpenAI,
      advanced: undefined as unknown as ChatOpenAI,
      advancedStrict: undefined as unknown as ChatOpenAI,
      embeddings: undefined as unknown as OpenAIEmbeddings,
    }),
  );
  const prompt = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate('System Message'),
    AIMessagePromptTemplate.fromTemplate('Assistant Message'),
    UserMessagePromptTemplate.fromNameAndTemplate('Username', '{text}'),
  ]);
  const response = await sut.generate(prompt, GptModels.Cheap, {
    text: 'User Message',
  });

  expect(response).toEqual({
    role: ChatGptRoles.Assistant,
    content: 'completion',
  });
  const humanMessage = new HumanMessage('User Message');
  humanMessage.name = 'Username';
  expect(chatOpenAiFake.request).toEqual([
    new SystemMessage('System Message'),
    new AIMessage('Assistant Message'),
    humanMessage,
  ]);
});
