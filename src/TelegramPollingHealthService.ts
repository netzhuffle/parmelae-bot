import { injectable } from 'inversify';

interface TelegramPollingStatusProvider {
  getWebhookInfo(): Promise<{
    pending_update_count?: number;
    url?: string;
  }>;
}

type ExitProcess = (code: number) => void;

const POLLING_HEALTH_CHECK_INTERVAL_IN_MILLISECONDS = 60 * 1000;
const MAX_CONSECUTIVE_PENDING_UPDATE_CHECKS = 3;

/** Detects dead Telegram long polling while the process is still alive. */
@injectable()
export class TelegramPollingHealthService {
  private consecutivePendingUpdateChecks = 0;
  private isRunning = false;
  private timeout: ReturnType<typeof setTimeout> | null = null;

  start(
    telegram: TelegramPollingStatusProvider,
    exitProcess: ExitProcess = (code) => process.exit(code),
  ): void {
    if (this.timeout) {
      return;
    }

    this.isRunning = true;
    const runCheck = () => {
      this.checkOnce(telegram, exitProcess)
        .catch((error) => {
          console.error('Telegram polling health check failed', error);
        })
        .finally(() => {
          if (!this.isRunning) {
            return;
          }
          this.timeout = setTimeout(runCheck, POLLING_HEALTH_CHECK_INTERVAL_IN_MILLISECONDS);
        });
    };

    this.timeout = setTimeout(runCheck, POLLING_HEALTH_CHECK_INTERVAL_IN_MILLISECONDS);
  }

  stop(): void {
    this.isRunning = false;
    if (!this.timeout) {
      return;
    }

    clearTimeout(this.timeout);
    this.timeout = null;
  }

  async checkOnce(
    telegram: TelegramPollingStatusProvider,
    exitProcess: ExitProcess = (code) => process.exit(code),
  ): Promise<void> {
    const webhookInfo = await telegram.getWebhookInfo();
    const pendingUpdateCount = webhookInfo.pending_update_count ?? 0;

    if (pendingUpdateCount === 0) {
      this.consecutivePendingUpdateChecks = 0;
      return;
    }

    this.consecutivePendingUpdateChecks++;
    console.error(
      `Telegram polling health check found ${pendingUpdateCount} pending updates ` +
        `(${this.consecutivePendingUpdateChecks}/${MAX_CONSECUTIVE_PENDING_UPDATE_CHECKS}).`,
    );

    if (this.consecutivePendingUpdateChecks < MAX_CONSECUTIVE_PENDING_UPDATE_CHECKS) {
      return;
    }

    console.error(
      'Telegram polling appears stalled while the process is still alive. ' +
        'Exiting so systemd restarts the bot.',
      {
        pendingUpdateCount,
        webhookUrl: webhookInfo.url ?? '',
      },
    );
    this.stop();
    exitProcess(1);
  }
}
