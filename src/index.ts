'use strict';

import {openAiKey, telegramToken, witToken} from '../config';
import oneLiners from './one_liners';
import triggers from './triggers';
import nicknames from './nicknames';
import gpt3 from './gpt3';
import {Bot} from './Bot';
import TelegramBot from 'node-telegram-bot-api';
import {Wit} from 'node-wit';
import {Configuration, OpenAIApi} from 'openai';

const flameRate = 0.035;
const telegram = new TelegramBot(telegramToken, {polling: true});
const wit = new Wit({accessToken: witToken});
const openAi = new OpenAIApi(new Configuration({
    apiKey: openAiKey
}));

const flameBot = new Bot(flameRate, oneLiners, triggers, nicknames, gpt3, telegram, wit, openAi);
flameBot.start();
