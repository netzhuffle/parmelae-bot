import { afterEach, beforeEach, describe, it, mock } from 'bun:test';
import { strict as assert } from 'node:assert';

import { TelegramPollingHealthService } from './TelegramPollingHealthService.js';

describe('TelegramPollingHealthService', () => {
  let consoleError: ReturnType<typeof mock>;
  const originalConsoleError = console.error;

  beforeEach(() => {
    consoleError = mock(() => undefined);
    console.error = consoleError;
  });

  afterEach(() => {
    console.error = originalConsoleError;
    mock.restore();
  });

  it('does not exit when Telegram has no pending updates', async () => {
    const service = new TelegramPollingHealthService();
    let didExit = false;

    await service.checkOnce(
      {
        getWebhookInfo: () => Promise.resolve({ pending_update_count: 0 }),
      },
      () => {
        didExit = true;
      },
    );

    assert.equal(didExit, false);
    assert.equal(consoleError.mock.calls.length, 0);
  });

  it('exits after repeated pending updates because polling is stale', async () => {
    const service = new TelegramPollingHealthService();
    let exitCode: number | null = null;
    const telegram = {
      getWebhookInfo: () => Promise.resolve({ pending_update_count: 8, url: '' }),
    };

    await service.checkOnce(telegram, (code) => {
      exitCode = code;
    });
    await service.checkOnce(telegram, (code) => {
      exitCode = code;
    });
    await service.checkOnce(telegram, (code) => {
      exitCode = code;
    });

    assert.equal(exitCode, 1);
    assert.equal(consoleError.mock.calls.length, 4);
  });

  it('resets the pending update counter after a healthy check', async () => {
    const service = new TelegramPollingHealthService();
    let exitCode: number | null = null;

    await service.checkOnce(
      {
        getWebhookInfo: () => Promise.resolve({ pending_update_count: 1 }),
      },
      (code) => {
        exitCode = code;
      },
    );
    await service.checkOnce(
      {
        getWebhookInfo: () => Promise.resolve({ pending_update_count: 0 }),
      },
      (code) => {
        exitCode = code;
      },
    );
    await service.checkOnce(
      {
        getWebhookInfo: () => Promise.resolve({ pending_update_count: 1 }),
      },
      (code) => {
        exitCode = code;
      },
    );

    assert.equal(exitCode, null);
  });
});
