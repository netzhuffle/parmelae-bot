import '@abraham/reflection';
import { Container } from 'inversify';
import { GptModelsProvider } from './GptModelsProvider.js';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { Octokit } from 'octokit';
import { Configuration, OpenAIApi } from 'openai';
import { PrismaClient } from '@prisma/client';
import { Config } from './Config.js';
import { Telegraf } from 'telegraf';

const container = new Container({
  defaultScope: 'Singleton',
  autoBindInjectable: true,
  skipBaseClassChecks: true,
});

container.bind(GptModelsProvider).toDynamicValue(
  (context) =>
    new GptModelsProvider({
      chatGpt: new ChatOpenAI({
        modelName: 'gpt-3.5-turbo',
        configuration: {
          basePath: 'https://oai.hconeai.com/v1',
          baseOptions: {
            headers: {
              'Helicone-Auth': `Bearer ${
                context.container.get(Config).heliconeApiKey
              }`,
            },
          },
        },
        verbose: true,
      }),
      chatGptStrict: new ChatOpenAI({
        modelName: 'gpt-3.5-turbo',
        temperature: 0,
        configuration: {
          basePath: 'https://oai.hconeai.com/v1',
          baseOptions: {
            headers: {
              'Helicone-Auth': `Bearer ${
                context.container.get(Config).heliconeApiKey
              }`,
            },
          },
        },
        verbose: true,
      }),
      gpt4: new ChatOpenAI({
        modelName: 'gpt-4',
        configuration: {
          basePath: 'https://oai.hconeai.com/v1',
          baseOptions: {
            headers: {
              'Helicone-Auth': `Bearer ${
                context.container.get(Config).heliconeApiKey
              }`,
            },
          },
        },
        verbose: true,
      }),
      gpt4Strict: new ChatOpenAI({
        modelName: 'gpt-4',
        temperature: 0,
        configuration: {
          basePath: 'https://oai.hconeai.com/v1',
          baseOptions: {
            headers: {
              'Helicone-Auth': `Bearer ${
                context.container.get(Config).heliconeApiKey
              }`,
            },
          },
        },
        verbose: true,
      }),
      embeddings: new OpenAIEmbeddings(
        {},
        {
          basePath: 'https://oai.hconeai.com/v1',
          baseOptions: {
            headers: {
              'Helicone-Auth': `Bearer ${
                context.container.get(Config).heliconeApiKey
              }`,
              'Helicone-Cache-Enabled': 'true',
            },
          },
        },
      ),
    }),
);
container.bind(Octokit).toDynamicValue(
  (context) =>
    new Octokit({
      auth: context.container.get(Config).gitHubPersonalAccessToken,
      userAgent: 'parmelae-bot',
      timeZone: 'Europe/Zurich',
    }),
);
container.bind(OpenAIApi).toDynamicValue(
  (context) =>
    new OpenAIApi(
      new Configuration({
        apiKey: context.container.get(Config).openAiKey,
      }),
    ),
);
container.bind(PrismaClient).toDynamicValue(() => new PrismaClient());
container
  .bind(Telegraf)
  .toDynamicValue(
    (context) => new Telegraf(context.container.get(Config).telegramToken),
  );

export default container;
