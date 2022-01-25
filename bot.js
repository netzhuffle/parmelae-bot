'use strict';

import {openAiKey, telegramToken, witToken} from './config.js';
import oneLiners from './one_liners.js';
import triggers from './triggers.js';
import nicknames from './nicknames.js';
import gpt3 from './gpt3.js';
import {spawn} from 'child_process';
import {FlameBot} from './FlameBot.js';
import TelegramBot from 'node-telegram-bot-api';
import nodeWitPackage from 'node-wit';
import openAiPackage from '@dalenguyen/openai';

const {Wit} = nodeWitPackage;
const {OpenAI} = openAiPackage;

const flameRate = 0.035;
const telegram = new TelegramBot(telegramToken, {polling: true});
const wit = new Wit({accessToken: witToken});
const openAi = new OpenAI(openAiKey);
const flameBot = new FlameBot(flameRate, oneLiners, triggers, nicknames, gpt3, telegram, spawn, wit, openAi);
flameBot.start();
