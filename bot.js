'use strict';

const config = require('./config.js');
const oneLiners = require('./one_liners.js');
const triggers = require('./triggers.js');
const replies = require('./replies.js');
const nicknames = require('./nicknames');
const cmd = require('node-cmd');
const FlameBot = require('./FlameBot.js');
const TelegramBot = require('node-telegram-bot-api');

const flameRate = 0.0001;
const telegram = new TelegramBot(config.token, {polling: true});
const flameBot = new FlameBot(flameRate, oneLiners, triggers, replies, nicknames, telegram, cmd);
flameBot.start();
