'use strict';

const {telegramToken, witToken} = require('./config.js');
const oneLiners = require('./one_liners.js');
const triggers = require('./triggers.js');
const replies = require('./replies.js');
const nicknames = require('./nicknames');
const {spawn} = require('child_process');
const FlameBot = require('./FlameBot.js');
const TelegramBot = require('node-telegram-bot-api');
const {Wit} = require('node-wit');

const flameRate = 0.0001;
const telegram = new TelegramBot(telegramToken, {polling: true});
const wit = new Wit({accessToken: witToken});
const flameBot = new FlameBot(flameRate, oneLiners, triggers, replies, nicknames, telegram, spawn, wit);
flameBot.start();
