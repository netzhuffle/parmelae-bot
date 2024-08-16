import '@abraham/reflection';
import { Container } from 'inversify';
import { GptModelsProvider } from './GptModelsProvider.js';
import { ChatOpenAI } from '@langchain/openai';
import { OpenAIEmbeddings } from '@langchain/openai';
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
      cheap: new ChatOpenAI({
        modelName: 'gpt-4o-mini',
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
      cheapStrict: new ChatOpenAI({
        modelName: 'gpt-4o-mini',
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
      advanced: new ChatOpenAI({
        modelName: 'gpt-4o',
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
      advancedStrict: new ChatOpenAI({
        modelName: 'gpt-4o',
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
