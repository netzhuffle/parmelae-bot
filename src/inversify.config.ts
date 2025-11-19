import 'reflect-metadata/lite';
import { Container } from 'inversify';
import {
  GptModels,
  GptModelsProvider,
  GptModelsSettings,
} from './GptModelsProvider.js';
import { ChatOpenAI, DallEAPIWrapper } from '@langchain/openai';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Octokit } from 'octokit';
import { PrismaClient } from './generated/prisma/client.js';
import { PrismaBunSQLite } from '@synapsenwerkstatt/prisma-bun-sqlite-adapter';
import { Config } from './Config.js';
import { Telegraf } from 'telegraf';
import {
  POKEMON_TCGP_YAML_SYMBOL,
  Sets,
} from './PokemonTcgPocket/PokemonTcgPocketService.js';

const container = new Container({
  defaultScope: 'Singleton',
  autobind: true,
});

// Bind Pokemon TCG Pocket YAML file
container
  .bind(POKEMON_TCGP_YAML_SYMBOL)
  .toDynamicValue(async (): Promise<Sets> => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { default: sets } = await import('../resources/tcgpcards.yaml');
    return sets as Sets;
  });

container.bind(GptModelsProvider).toDynamicValue(
  (context) =>
    new GptModelsProvider({
      cheap: new ChatOpenAI({
        ...GptModelsSettings[GptModels.Cheap],
        apiKey: context.get(Config).heliconeApiKey,
        configuration: {
          baseURL: 'https://ai-gateway.helicone.ai/v1',
        },
      }),
      advanced: new ChatOpenAI({
        ...GptModelsSettings[GptModels.Advanced],
        apiKey: context.get(Config).heliconeApiKey,
        configuration: {
          baseURL: 'https://ai-gateway.helicone.ai/v1',
        },
      }),
      embeddings: new OpenAIEmbeddings({
        model: 'text-embedding-3-small',
        apiKey: context.get(Config).heliconeApiKey,
        configuration: {
          baseURL: 'https://ai-gateway.helicone.ai/v1',
        },
      }),
    }),
);
container.bind(DallEAPIWrapper).toDynamicValue(
  (context) =>
    new DallEAPIWrapper({
      model: 'dall-e-3',
      size: '1024x1024',
      quality: 'hd',
      apiKey: context.get(Config).openAiKey,
    }),
);
container.bind(Octokit).toDynamicValue(
  (context) =>
    new Octokit({
      auth: context.get(Config).gitHubPersonalAccessToken,
      userAgent: 'parmelae-bot',
      timeZone: 'Europe/Zurich',
    }),
);
container.bind(PrismaClient).toDynamicValue(() => {
  const adapter = new PrismaBunSQLite({
    url: 'file:./prisma/sqlite.db',
  });

  return new PrismaClient({
    adapter,
    errorFormat: 'pretty',
  });
});
container
  .bind(Telegraf)
  .toDynamicValue((context) => new Telegraf(context.get(Config).telegramToken));

export default container;
