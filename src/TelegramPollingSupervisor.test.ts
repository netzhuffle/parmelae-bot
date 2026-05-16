import { afterEach, beforeEach, describe, it, jest, mock } from 'bun:test';
import { strict as assert } from 'node:assert';

import { TelegramPollingSupervisor } from './TelegramPollingSupervisor.js';

describe('TelegramPollingSupervisor', () => {
  let consoleError: ReturnType<typeof mock>;
  let consoleInfo: ReturnType<typeof mock>;
  const originalConsoleError = console.error;
  const originalConsoleInfo = console.info;

  beforeEach(() => {
    consoleError = mock(() => undefined);
    consoleInfo = mock(() => undefined);
    console.error = consoleError;
    console.info = consoleInfo;
  });

  afterEach(() => {
    console.error = originalConsoleError;
    console.info = originalConsoleInfo;
    jest.useRealTimers();
    mock.restore();
  });

  it('launches polling and calls onLaunch immediately', async () => {
    const supervisor = new TelegramPollingSupervisor();
    let didLaunch = false;
    let didCallOnLaunch = false;

    supervisor.start(
      async (onLaunch) => {
        didLaunch = true;
        onLaunch();
        await new Promise(() => undefined);
      },
      () => {
        didCallOnLaunch = true;
      },
    );
    await Promise.resolve();

    assert.equal(didLaunch, true);
    assert.equal(didCallOnLaunch, true);
    assert.equal(consoleInfo.mock.calls[0]?.[0], 'Telegram long polling started.');
    supervisor.stop();
  });

  it('reconnects after polling rejects', async () => {
    jest.useFakeTimers();
    const supervisor = new TelegramPollingSupervisor();
    let launchCount = 0;

    supervisor.start(
      (onLaunch) => {
        launchCount++;
        onLaunch();
        return Promise.reject(new Error('network failed'));
      },
      () => undefined,
    );
    await Promise.resolve();
    await Promise.resolve();

    assert.equal(launchCount, 1);
    jest.advanceTimersByTime(5000);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    assert.equal(launchCount, 2);
    assert.equal(
      consoleInfo.mock.calls[1]?.[0],
      'Telegram long polling reconnected after 1 restart attempt(s).',
    );
    assert.equal(consoleError.mock.calls.length, 2);
    supervisor.stop();
  });
});
