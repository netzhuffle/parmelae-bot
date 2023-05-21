import { injectable } from 'inversify';
import { ScheduledMessageRepository } from './Repositories/ScheduledMessageRepository';
import { TelegramService } from './TelegramService';
import * as Sentry from '@sentry/node';

const ONE_SECOND_IN_MILLISECONDS = 1000;

/** Schedule scheduled messages */
@injectable()
export class ScheduledMessageService {
  constructor(
    private readonly repository: ScheduledMessageRepository,
    private readonly telegram: TelegramService,
  ) {}

  /** Schedules all scheduled message from the database. */
  async schedule(): Promise<void> {
    const now = Date.now();
    const messages = await this.repository.retrieveAll();
    messages.forEach((message) => {
      const timeout = message.sendAt.getTime() - now;
      if (timeout <= ONE_SECOND_IN_MILLISECONDS) {
        this.send(message.text, message.id, message.chatId);
      } else {
        setTimeout(
          this.send.bind(this, message.text, message.id, message.chatId),
          timeout,
        );
      }
    });
  }

  send(message: string, id: number, chatId: bigint): void {
    this.telegram
      .send(message, chatId)
      .then(() => this.repository.delete(id))
      .catch(Sentry.captureException);
  }
}
