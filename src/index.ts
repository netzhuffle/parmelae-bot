import * as Sentry from '@sentry/node';

import { Bot } from './Bot.js';
import { Config } from './Config.js';
import container from './inversify.config.js';

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

// Wrap async initialization in an IIFE to keep startup explicit and synchronous at module scope.
void (async () => {
  const bot = await container.getAsync(Bot);
  bot.start();
})();
