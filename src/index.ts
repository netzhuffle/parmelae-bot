import container from './inversify.config.js';
import { Config } from './Config.js';
import { Bot } from './Bot.js';
import * as Sentry from '@sentry/node';

const config = container.get(Config);
if (config.sentryDsn) {
  Sentry.init({
    dsn: config.sentryDsn,
    tracesSampleRate: 0.1,
    integrations: [
      Sentry.rewriteFramesIntegration({
        root: process.cwd(),
      }),
    ],
  });
}

const bot = await container.getAsync(Bot);
bot.start();
