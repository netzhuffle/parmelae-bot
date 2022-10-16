import {Message} from "@prisma/client";
import assert from "assert";
import {delay, inject, singleton} from "tsyringe";
import {Gpt3Service} from "./Gpt3Service";
import {Config} from "./Config";
import {TelegramService} from "./TelegramService";
import {MessageWithUser} from "./Repositories/Types";
import {OldMessageReplyGenerator} from "./MessageGenerators/OldMessageReplyGenerator";

/**
 * Minimum length to consider reply to a message.
 *
 * Shorter message likely have not enough good information for GPT-3.
 */
const MINIMUM_MESSAGE_REPLY_LENGTH = 100;

/** Probability to reply to an old message per day and chat (1 = 100%). */
const OLD_MESSAGE_REPLY_PROBABILITY = 0.15;

/** Replies to random old messages. */
@singleton()
export class OldMessageReplyService {
    constructor(
        @inject('Config') private readonly config: Config,
        private readonly oldMessageReplyGenerator: OldMessageReplyGenerator,
        // Injection delayed because of dependency loop between TelegramService, MessageStorageService, and OldMessageReplyService.
        @inject(delay(() => TelegramService)) private readonly telegramService: TelegramService,
    ) {
    }

    /**
     * Replies to random old messages with a certain probability.
     *
     * Not more than 1 message per chat receives a reply.
     * @param oldMessages List of old messages
     */
    async reply(oldMessages: MessageWithUser[]): Promise<void> {
        let replyCandidates = oldMessages.filter(message => this.mayReplyToOldMessage(message));
        while (replyCandidates.length > 0) {
            const randomMessageIndex = Math.floor(Math.random() * replyCandidates.length);
            const randomMessage = replyCandidates[randomMessageIndex];
            if (Math.random() < OLD_MESSAGE_REPLY_PROBABILITY) {
                await this.replyToMessage(randomMessage);
            }
            replyCandidates = replyCandidates.filter(message => message.chatId !== randomMessage.chatId);
        }
    }

    private async replyToMessage(message: Message) {
        assert(message.text);

        const reply = await this.oldMessageReplyGenerator.generate(message.text);
        await this.telegramService.reply(reply, {
            message_id: message.messageId,
            chat: {
                id: Number(message.chatId),
            },
        });
    }

    private mayReplyToOldMessage(message: MessageWithUser): boolean {
        if (message.text === null) {
            // Only reply to messages with text.
            return false;
        }

        if (!this.config.chatAllowlist.includes(Number(message.chatId))) {
            // Restrict to messages in allowlisted chats.
            return false;
        }

        if (message.text.length < MINIMUM_MESSAGE_REPLY_LENGTH) {
            // Short messages likely have not good enough content for GPT-3.
            return false;
        }

        if (message.text.length >= Gpt3Service.MAX_INPUT_TEXT_LENGTH) {
            // Message too expensive to send to GPT-3.
            return false;
        }

        if (message.from.username === this.config.username) {
            // Don’t reply to own messages.
            return false;
        }

        if (message.text.includes('@' + this.config.username)) {
            // Message that mentions the bot already received a reply.
            return false;
        }

        return true;
    }
}
