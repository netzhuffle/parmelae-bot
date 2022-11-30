// For Sentry setup
const rootDirectory = __dirname || process.cwd();

import 'reflect-metadata';
import {Config} from './src/Config';
import config from './config';
import {Bot} from './src/Bot';
import TelegramBot from 'node-telegram-bot-api';
import {Wit} from 'node-wit';
import {Configuration, OpenAIApi} from 'openai';
import {container} from 'tsyringe';
import {PrismaClient} from '@prisma/client';
import {Octokit} from 'octokit';
import * as Sentry from '@sentry/node';
import {RewriteFrames} from "@sentry/integrations";

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

container.register<Config>('Config', {useValue: config as Config});
container.register(Octokit, {
    useValue: new Octokit({
        auth: config.gitHubPersonalAccessToken ?? undefined,
        userAgent: 'parmelae-bot',
        timeZone: 'Europe/Zurich',
    })
});
container.register(OpenAIApi, {
    useValue: new OpenAIApi(new Configuration({
        apiKey: config.openAiKey
    }))
});
container.register(PrismaClient, {useValue: new PrismaClient()});
container.register(TelegramBot, {useValue: new TelegramBot(config.telegramToken, {polling: true})});
container.register(Wit, {useValue: new Wit({accessToken: config.witToken})});

const bot = container.resolve(Bot);
bot.start();
