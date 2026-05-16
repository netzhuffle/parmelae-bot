import { injectable } from 'inversify';

type LaunchTelegramPolling = (onLaunch: () => void) => Promise<void>;

const TELEGRAM_POLLING_RECONNECT_DELAY_IN_MILLISECONDS = 5 * 1000;

/** Keeps Telegram long polling running after Telegraf's polling promise rejects. */
@injectable()
export class TelegramPollingSupervisor {
  private isRunning = false;
  private launchCount = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  start(launch: LaunchTelegramPolling, onLaunch: () => void): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    void this.run(launch, onLaunch);
  }

  stop(): void {
    this.isRunning = false;
    if (this.reconnectTimeout === null) {
      return;
    }

    clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = null;
  }

  private async run(launch: LaunchTelegramPolling, onLaunch: () => void): Promise<void> {
    while (this.isRunning) {
      try {
        // oxlint-disable-next-line no-await-in-loop -- Polling must finish or fail before a reconnect attempt starts.
        await launch(() => {
          this.launchCount++;
          console.info(
            this.launchCount === 1
              ? 'Telegram long polling started.'
              : `Telegram long polling reconnected after ${this.launchCount - 1} restart attempt(s).`,
          );
          onLaunch();
        });
        if (this.isRunning) {
          console.error('Telegram long polling stopped unexpectedly. Reconnecting.');
        }
      } catch (error) {
        if (this.isRunning) {
          console.error('Telegram long polling failed. Reconnecting.', error);
        }
      }

      if (this.isRunning) {
        // oxlint-disable-next-line no-await-in-loop -- Reconnect attempts are intentionally serialized.
        await this.waitForReconnectDelay();
      }
    }
  }

  private waitForReconnectDelay(): Promise<void> {
    return new Promise((resolve) => {
      this.reconnectTimeout = setTimeout(() => {
        this.reconnectTimeout = null;
        resolve();
      }, TELEGRAM_POLLING_RECONNECT_DELAY_IN_MILLISECONDS);
    });
  }
}
