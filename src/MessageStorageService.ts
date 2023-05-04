import { injectable } from 'inversify';
import { MessageRepository } from './Repositories/MessageRepository';
import { OldMessageReplyService } from './OldMessageReplyService';
import { MessageWithRelations } from './Repositories/Types';

/** First hour to reply to old messages in. */
const MAIN_CHAT_TIME_STARTING_HOUR = 11;

/** Last hour to reply to old messages in. */
const MAIN_CHAT_TIME_ENDING_HOUR = 23;

/** Milliseconds per hour. */
const HOUR_IN_MILLISECONDS = 60 * 60 * 1000;

/** Handles the message database storage. */
@injectable()
export class MessageStorageService {
  constructor(private readonly messageRepository: MessageRepository) {}

  /** Stores a message and its author if message type is supported by storage. */
  async store(message: MessageWithRelations): Promise<void> {
    await this.messageRepository.store(message);
  }

  /**
   * Starts daily message deletion.
   *
   * Waits until random time between main chat time to execute the deletion. Instantly deletes if currently in between
   * main chat time. Schedules daily deletion.
   */
  startDailyDeletion(oldMessageReplyService: OldMessageReplyService): void {
    const nowInMilliseconds = Date.now();
    const now = new Date();
    const todaysMainChatStartTimeInMilliseconds = now.setHours(
      MAIN_CHAT_TIME_STARTING_HOUR,
      0,
      0,
      0,
    );
    const todaysMainChatEndTimeInMilliseconds = now.setHours(
      MAIN_CHAT_TIME_ENDING_HOUR,
      59,
      59,
      999,
    );
    if (
      nowInMilliseconds >= todaysMainChatStartTimeInMilliseconds &&
      nowInMilliseconds <= todaysMainChatEndTimeInMilliseconds
    ) {
      this.deleteAndScheduleNext(oldMessageReplyService);
    } else {
      this.scheduleNextDeletion(oldMessageReplyService);
    }
  }

  private deleteAndScheduleNext(
    oldMessageReplyService: OldMessageReplyService,
  ) {
    this.messageRepository
      .deleteOld()
      .then((deletedMessages) => oldMessageReplyService.reply(deletedMessages))
      .catch((e) =>
        console.error('old messages could not be deleted or replied to', e),
      );
    this.scheduleNextDeletion(oldMessageReplyService);
  }

  private scheduleNextDeletion(oldMessageReplyService: OldMessageReplyService) {
    const mainChatLengthInHours =
      MAIN_CHAT_TIME_ENDING_HOUR - MAIN_CHAT_TIME_STARTING_HOUR + 1;
    const mainChatLengthInMilliseconds =
      mainChatLengthInHours * HOUR_IN_MILLISECONDS;
    const randomMillisecondInMainChatTime = Math.floor(
      Math.random() * mainChatLengthInMilliseconds,
    );
    const tomorrowMainChatStartTimeDate = new Date();
    tomorrowMainChatStartTimeDate.setDate(
      tomorrowMainChatStartTimeDate.getDate() + 1,
    );
    const tomorrowMainChatStartTimeInMilliseconds =
      tomorrowMainChatStartTimeDate.setHours(
        MAIN_CHAT_TIME_STARTING_HOUR,
        0,
        0,
        0,
      );
    const waitingTimeInMilliseconds =
      tomorrowMainChatStartTimeInMilliseconds +
      randomMillisecondInMainChatTime -
      Date.now();
    setTimeout(
      this.deleteAndScheduleNext.bind(this, oldMessageReplyService),
      waitingTimeInMilliseconds,
    );
  }
}
