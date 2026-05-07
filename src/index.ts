import * as Sentry from '@sentry/node';

import { runDeployCommand } from './Deploy/DeployCommand.js';

void (async () => {
  if (Bun.argv[2] === 'deploy') {
    const exitCode = await runDeployCommand(Bun.argv.slice(3));
    process.exit(exitCode);
  }

  const [{ Bot }, { Config }, { default: container }] = await Promise.all([
    import('./Bot.js'),
    import('./Config.js'),
    import('./inversify.config.js'),
  ]);
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
})();
