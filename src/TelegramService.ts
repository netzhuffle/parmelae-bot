import TelegramBot from "node-telegram-bot-api";
import {singleton} from "tsyringe";
import {Sticker} from "./Sticker";
import {MessageStorageService} from "./MessageStorageService";

/** Service to interact with Telegram */
@singleton()
export class TelegramService {
    constructor(
        private readonly telegram: TelegramBot,
        private readonly messageStorageService: MessageStorageService,
    ) {
    }

    /**
     * Send a message or sticker
     *
     * @param message - The text or Sticker to send
     * @param chat - The chat to send in
     */
    async send(message: string | Sticker, chat: TelegramBot.Chat | number): Promise<void> {
        const chatId = typeof chat === "number" ? chat : chat.id;
        if (message instanceof Sticker) {
            this.telegram.sendSticker(chatId, message.fileId);
        } else {
            const sentMessage = await this.telegram.sendMessage(chatId, message);
            await this.messageStorageService.store(sentMessage);
        }
    }

    /**
     * Replies to a message
     *
     * @param reply - The text or Sticker to send
     * @param message - The message to reply to
     */
    async reply(reply: string | Sticker, message: TelegramBot.Message | {
        message_id: number,
        chat: { id: number }
    }): Promise<void> {
        if (reply instanceof Sticker) {
            this.telegram.sendSticker(message.chat.id, reply.fileId, {reply_to_message_id: message.message_id});
        } else {
            const sentMessage = await this.telegram.sendMessage(message.chat.id, reply, {reply_to_message_id: message.message_id});
            await this.messageStorageService.store(sentMessage);
        }
    }

    /**
     * Replies an image to a message
     *
     * @param url - The image URL
     * @param caption - The image caption
     * @param message - The message to reply to
     */
    async replyWithImage(url: string, caption: string, message: TelegramBot.Message): Promise<void> {
        await this.telegram.sendPhoto(message.chat.id, url, {
            caption: caption,
            reply_to_message_id: message.message_id
        });
    }
}
