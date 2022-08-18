import 'reflect-metadata';
import {Config} from './Config';
import config from '../config';
import {Bot} from './Bot';
import TelegramBot from 'node-telegram-bot-api';
import {Wit} from 'node-wit';
import {Configuration, OpenAIApi} from 'openai';
import {container} from "tsyringe";

container.register<Config>('Config', {useValue: config as Config});
container.register(TelegramBot, {useValue: new TelegramBot(config.telegramToken, {polling: true})});
container.register(Wit, {useValue: new Wit({accessToken: config.witToken})});
container.register(OpenAIApi, {
    useValue: new OpenAIApi(new Configuration({
        apiKey: config.openAiKey
    }))
});

const bot = container.resolve(Bot);
bot.start();
