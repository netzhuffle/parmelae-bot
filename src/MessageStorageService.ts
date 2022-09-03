import TelegramBot from "node-telegram-bot-api";
import {singleton} from "tsyringe";
import {MessageRepository} from "./Repositories/MessageRepository";
import {OldMessageReplyService} from "./OldMessageReplyService";

/** First hour to reply to old messages in. */
const MAIN_CHAT_TIME_STARTING_HOUR = 11;

/** Last hour to reply to old messages in. */
const MAIN_CHAT_TIME_ENDING_HOUR = 23;

/** Milliseconds per hour. */
const HOUR_IN_MILLISECONDS = 60 * 60 * 1000;

/** Handles the message database storage. */
@singleton()
export class MessageStorageService {
    constructor(
        private readonly messageRepository: MessageRepository,
        private readonly oldMessageReplyService: OldMessageReplyService,
    ) {
    }

    /** Stores a message and its author. */
    async store(message: TelegramBot.Message): Promise<void> {
        if (!message.from || !message.text) {
            // Only store messages from a user that contain text.
            return;
        }

        await this.messageRepository.store(message);
    }

    /**
     * Starts daily message deletion.
     *
     * Waits until random time between main chat time to execute the deletion. Instantly deletes if currently in between
     * main chat time. Schedules daily deletion.
     */
    startDailyDeletion(): void {
        const nowInMilliseconds = Date.now();
        const now = new Date();
        const todaysMainChatStartTimeInMilliseconds = now.setHours(MAIN_CHAT_TIME_STARTING_HOUR, 0, 0, 0);
        const todaysMainChatEndTimeInMilliseconds = now.setHours(MAIN_CHAT_TIME_ENDING_HOUR, 59, 59, 999);
        if (nowInMilliseconds >= todaysMainChatStartTimeInMilliseconds && nowInMilliseconds <= todaysMainChatEndTimeInMilliseconds) {
            this.deleteAndScheduleNext();
        } else {
            this.scheduleNextDeletion();
        }
    }

    private async deleteAndScheduleNext(): Promise<void> {
        const deletedMessages = await this.messageRepository.deleteOld();
        await this.oldMessageReplyService.reply(deletedMessages);
        this.scheduleNextDeletion();
    }

    private scheduleNextDeletion() {
        const mainChatLengthInHours = MAIN_CHAT_TIME_ENDING_HOUR - MAIN_CHAT_TIME_STARTING_HOUR + 1;
        const mainChatLengthInMilliseconds = mainChatLengthInHours * HOUR_IN_MILLISECONDS;
        const randomMillisecondInMainChatTime = Math.floor(Math.random() * mainChatLengthInMilliseconds);
        const tomorrowMainChatStartTimeDate = new Date();
        tomorrowMainChatStartTimeDate.setDate(tomorrowMainChatStartTimeDate.getDate() + 1);
        const tomorrowMainChatStartTimeInMilliseconds = tomorrowMainChatStartTimeDate.setHours(MAIN_CHAT_TIME_STARTING_HOUR, 0, 0, 0);
        const waitingTimeInMilliseconds = tomorrowMainChatStartTimeInMilliseconds + randomMillisecondInMainChatTime - Date.now();
        setTimeout(this.deleteAndScheduleNext.bind(this), waitingTimeInMilliseconds);
    }
}
