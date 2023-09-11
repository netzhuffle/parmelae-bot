import container from './inversify.config';
import { Config } from './Config';
import { Bot } from './Bot';
import * as Sentry from '@sentry/node';
import { RewriteFrames } from '@sentry/integrations';

const config = container.get(Config);
if (config.sentryDsn) {
  Sentry.init({
    dsn: config.sentryDsn,
    tracesSampleRate: 0.1,
    integrations: [
      new RewriteFrames({
        root: process.cwd(),
      }),
    ],
  });
}

const bot = container.get(Bot);
bot.start();
