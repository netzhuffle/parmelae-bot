import '@abraham/reflection';
import { Container } from "inversify";
import { CallbackManager, ConsoleCallbackHandler } from 'langchain/callbacks';
import { GptModelsProvider } from './GptModelsProvider';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { Octokit } from 'octokit';
import { Configuration, OpenAIApi } from 'openai';
import { PrismaClient } from '@prisma/client';
import { Config } from './Config';
import TelegramBot from 'node-telegram-bot-api';

const container = new Container({ defaultScope: "Singleton", autoBindInjectable: true, skipBaseClassChecks: true });

container.bind(CallbackManager).toDynamicValue(() => {
    const callbackManager = new CallbackManager();
    callbackManager.addHandler(new ConsoleCallbackHandler());
    return callbackManager;
});
container.bind(GptModelsProvider).toDynamicValue(() =>
    new GptModelsProvider({
        chatGpt: new ChatOpenAI({
            modelName: 'gpt-3.5-turbo',
            callbackManager: container.resolve(CallbackManager),
        }),
        chatGptStrict: new ChatOpenAI({
            modelName: 'gpt-3.5-turbo',
            temperature: 0,
            callbackManager: container.resolve(CallbackManager),
        }),
        gpt4: new ChatOpenAI({
            modelName: 'gpt-4',
            callbackManager: container.resolve(CallbackManager),
        }),
        gpt4Strict: new ChatOpenAI({
            modelName: 'gpt-4',
            temperature: 0,
            callbackManager: container.resolve(CallbackManager),
        }),
        embeddings: new OpenAIEmbeddings(),
    }),
);
container.bind(Octokit).toDynamicValue((context) =>
    new Octokit({
        auth: context.container.get(Config).gitHubPersonalAccessToken,
        userAgent: 'parmelae-bot',
        timeZone: 'Europe/Zurich',
    }),
);
container.bind(OpenAIApi).toDynamicValue((context) =>
    new OpenAIApi(
        new Configuration({
            apiKey: context.container.get(Config).openAiKey,
        }),
    ),
);
container.bind(PrismaClient).toDynamicValue(() => new PrismaClient());
container.bind(TelegramBot).toDynamicValue((context) =>
    new TelegramBot(
        context.container.get(Config).telegramToken,
        {
            polling: true,
        },
    ),
);

export default container;
