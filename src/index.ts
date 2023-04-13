// For Sentry setup
import { GptModelsProvider } from "./GptModelsProvider";

const rootDirectory = __dirname || process.cwd();

import 'reflect-metadata';
import { Config } from './Config';
import { Bot } from './Bot';
import TelegramBot from 'node-telegram-bot-api';
import { Configuration, OpenAIApi } from 'openai';
import { container, instanceCachingFactory } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import { Octokit } from 'octokit';
import * as Sentry from '@sentry/node';
import { RewriteFrames } from "@sentry/integrations";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { CallbackManager } from "langchain/callbacks";
import { ConsoleCallbackHandler } from "langchain/callbacks";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { OpenAI } from "langchain/llms/openai";

const config = container.resolve(Config);
if (config.sentryDsn) {
    Sentry.init({
        dsn: config.sentryDsn,
        tracesSampleRate: 0.1,
        integrations: [
            new RewriteFrames({
                root: rootDirectory,
            }),
        ],
    });
}

container.register(CallbackManager, {
    useFactory: instanceCachingFactory(() => {
        const callbackManager = new CallbackManager();
        callbackManager.addHandler(new ConsoleCallbackHandler());
        return callbackManager;
    }),
});
container.register(GptModelsProvider, {
    useValue: new GptModelsProvider({
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
        embeddings: new OpenAIEmbeddings(),
    }
    ),
});
container.register(Octokit, {
    useValue: new Octokit({
        auth: config.gitHubPersonalAccessToken ?? undefined,
        userAgent: 'parmelae-bot',
        timeZone: 'Europe/Zurich',
    }),
});
container.register(OpenAIApi, {
    useValue: new OpenAIApi(new Configuration({
        apiKey: config.openAiKey
    })),
});
container.register(PrismaClient, {
    useValue: new PrismaClient(),
});
container.register(TelegramBot, {
    useValue: new TelegramBot(config.telegramToken, {
        polling: true,
    }),
});

const bot = container.resolve(Bot);
bot.start();
