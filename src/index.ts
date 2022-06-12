import 'reflect-metadata';
import {openAiKey, telegramToken, witToken} from '../config';
import {Bot} from './Bot';
import TelegramBot from 'node-telegram-bot-api';
import {Wit} from 'node-wit';
import {Configuration, OpenAIApi} from 'openai';
import {container} from "tsyringe";

container.register(TelegramBot, {useValue: new TelegramBot(telegramToken, {polling: true})});
container.register(Wit, {useValue: new Wit({accessToken: witToken})});
container.register(OpenAIApi, {
    useValue: new OpenAIApi(new Configuration({
        apiKey: openAiKey
    }))
});

const bot = container.resolve(Bot);
bot.start();
