import { ChatGptService, UserMessagePromptTemplate } from './ChatGptService.js';
import { ChatGptRoles } from './MessageGenerators/ChatGptMessage.js';
import { GptModels, GptModelsProvider } from './GptModelsProvider.js';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import {
  AIChatMessage,
  HumanChatMessage,
  SystemChatMessage,
} from 'langchain/schema';
import {
  AIMessagePromptTemplate,
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
} from 'langchain/prompts';
import { ChatOpenAiFake } from './Fakes/ChatOpenAiFake.js';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';

test('generate message', async () => {
  const chatOpenAiFake = new ChatOpenAiFake(new AIChatMessage('completion'));
  const sut = new ChatGptService(
    new GptModelsProvider({
      turbo: chatOpenAiFake as unknown as ChatOpenAI,
      turboStrict: undefined as unknown as ChatOpenAI,
      gpt4: undefined as unknown as ChatOpenAI,
      gpt4Strict: undefined as unknown as ChatOpenAI,
      gpt4Turbo: undefined as unknown as ChatOpenAI,
      gpt4TurboStrict: undefined as unknown as ChatOpenAI,
      gpt4Vision: undefined as unknown as ChatOpenAI,
      embeddings: undefined as unknown as OpenAIEmbeddings,
    }),
  );
  const prompt = ChatPromptTemplate.fromPromptMessages([
    SystemMessagePromptTemplate.fromTemplate('System Message'),
    AIMessagePromptTemplate.fromTemplate('Assistant Message'),
    UserMessagePromptTemplate.fromNameAndTemplate('Username', '{text}'),
  ]);
  const response = await sut.generate(prompt, GptModels.Turbo, {
    text: 'User Message',
  });

  expect(response).toEqual({
    role: ChatGptRoles.Assistant,
    content: 'completion',
  });
  const humanMessage = new HumanChatMessage('User Message');
  humanMessage.name = 'Username';
  expect(chatOpenAiFake.request).toEqual([
    new SystemChatMessage('System Message'),
    new AIChatMessage('Assistant Message'),
    humanMessage,
  ]);
});
