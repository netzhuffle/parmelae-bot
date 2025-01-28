import 'reflect-metadata/lite';
import { Container } from 'inversify';
import { GptModelsProvider } from './GptModelsProvider.js';
import { ChatOpenAI } from '@langchain/openai';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Octokit } from 'octokit';
import { OpenAI } from 'openai';
import { PrismaClient } from '@prisma/client';
import { Config } from './Config.js';
import { Telegraf } from 'telegraf';
import { readFileSync } from 'fs';
import { PokemonTcgPocketYamlSymbol } from './PokemonTcgPocketService.js';

const container = new Container({
  defaultScope: 'Singleton',
  autoBindInjectable: true,
  skipBaseClassChecks: true,
});

// Bind Pokemon TCG Pocket YAML content
container.bind(PokemonTcgPocketYamlSymbol).toDynamicValue(() => {
  return readFileSync('resources/tcgpcards.yml', 'utf-8');
});

container.bind(GptModelsProvider).toDynamicValue(
  (context) =>
    new GptModelsProvider({
      cheap: new ChatOpenAI({
        model: 'gpt-4o-mini',
        configuration: {
          baseURL: 'https://oai.hconeai.com/v1',
          defaultHeaders: {
            'Helicone-Auth': `Bearer ${
              context.container.get(Config).heliconeApiKey
            }`,
          },
        },
      }),
      cheapStrict: new ChatOpenAI({
        model: 'gpt-4o-mini',
        temperature: 0,
        configuration: {
          baseURL: 'https://oai.hconeai.com/v1',
          defaultHeaders: {
            'Helicone-Auth': `Bearer ${
              context.container.get(Config).heliconeApiKey
            }`,
          },
        },
      }),
      advanced: new ChatOpenAI({
        model: 'gpt-4o',
        configuration: {
          baseURL: 'https://oai.hconeai.com/v1',
          defaultHeaders: {
            'Helicone-Auth': `Bearer ${
              context.container.get(Config).heliconeApiKey
            }`,
          },
        },
      }),
      advancedStrict: new ChatOpenAI({
        model: 'gpt-4o',
        temperature: 0,
        configuration: {
          baseURL: 'https://oai.hconeai.com/v1',
          defaultHeaders: {
            'Helicone-Auth': `Bearer ${
              context.container.get(Config).heliconeApiKey
            }`,
          },
        },
      }),
      embeddings: new OpenAIEmbeddings({
        model: 'text-embedding-3-small',
        configuration: {
          baseURL: 'https://oai.hconeai.com/v1',
          defaultHeaders: {
            'Helicone-Auth': `Bearer ${
              context.container.get(Config).heliconeApiKey
            }`,
            'Helicone-Cache-Enabled': 'true',
          },
        },
      }),
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
