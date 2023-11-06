import '@abraham/reflection';
import { Container } from 'inversify';
import { GptModelsProvider } from './GptModelsProvider.js';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { Octokit } from 'octokit';
import { OpenAI } from 'openai';
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
      turbo: new ChatOpenAI({
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
      turboStrict: new ChatOpenAI({
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
      gpt4Turbo: new ChatOpenAI({
        modelName: 'gpt-4-1106-preview',
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
      gpt4TurboStrict: new ChatOpenAI({
        modelName: 'gpt-4-1106-preview',
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
container.bind(OpenAI).toDynamicValue(
  (context) =>
    new OpenAI({
      apiKey: context.container.get(Config).openAiKey,
    }),
);
container.bind(PrismaClient).toDynamicValue(() => new PrismaClient());
container
  .bind(Telegraf)
  .toDynamicValue(
    (context) => new Telegraf(context.container.get(Config).telegramToken),
  );

export default container;
