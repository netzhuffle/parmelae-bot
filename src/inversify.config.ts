import 'reflect-metadata/lite';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PrismaBunSQLite } from '@synapsenwerkstatt/prisma-bun-sqlite-adapter';
import { Container } from 'inversify';
import { Octokit } from 'octokit';

import { Config } from './Config.js';
import { PrismaClient } from './generated/prisma/client.js';
import { GptModels, GptModelsProvider, GptModelsSettings } from './GptModelsProvider.js';
import { createObservedChatOpenAI } from './HostedImageGenerationObserver.js';
import { POKEMON_TCGP_YAML_SYMBOL, Sets } from './PokemonTcgPocket/PokemonTcgPocketService.js';
import { getDatabaseUrl } from './RuntimePaths.js';

const container = new Container({
  defaultScope: 'Singleton',
  autobind: true,
});

// Bind Pokemon TCG Pocket YAML file
container.bind(POKEMON_TCGP_YAML_SYMBOL).toDynamicValue(async (): Promise<Sets> => {
  const { default: sets } = await import('../resources/tcgpcards.yaml');
  return sets as Sets;
});

container.bind(GptModelsProvider).toDynamicValue(
  (context) =>
    new GptModelsProvider({
      cheap: createObservedChatOpenAI({
        ...GptModelsSettings[GptModels.Cheap],
        apiKey: context.get(Config).heliconeApiKey,
        configuration: {
          baseURL: 'https://ai-gateway.helicone.ai/v1',
        },
      }),
      advanced: createObservedChatOpenAI({
        ...GptModelsSettings[GptModels.Advanced],
        apiKey: context.get(Config).heliconeApiKey,
        configuration: {
          baseURL: 'https://ai-gateway.helicone.ai/v1',
        },
      }),
      embeddings: new OpenAIEmbeddings({
        model: 'text-embedding-3-small',
        apiKey: context.get(Config).openAiKey,
      }),
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
    url: getDatabaseUrl(),
  });

  return new PrismaClient({
    adapter,
    errorFormat: 'pretty',
  });
});

export default container;
