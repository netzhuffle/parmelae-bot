import TelegramBot from "node-telegram-bot-api";
import {singleton} from "tsyringe";
import {Sticker} from "./Sticker";

/** Service to interact with Telegram */
@singleton()
export class TelegramService {
    constructor(private readonly telegram: TelegramBot) {
    }

    /**
     * Send a message or sticker
     *
     * @param message - The text or Sticker to send
     * @param chat - The chat to send in
     */
    send(message: string | Sticker, chat: TelegramBot.Chat): void {
        if (message instanceof Sticker) {
            this.telegram.sendSticker(chat.id, message.fileId);
        } else {
            this.telegram.sendMessage(chat.id, message);
        }
    }

    /**
     * Replies to a message
     *
     * @param reply - The text or Sticker to send
     * @param message - The message to reply to
     */
    reply(reply: string | Sticker, message: TelegramBot.Message): void {
        if (reply instanceof Sticker) {
            this.telegram.sendSticker(message.chat.id, reply.fileId, {reply_to_message_id: message.message_id});
        } else {
            this.telegram.sendMessage(message.chat.id, reply, {reply_to_message_id: message.message_id});
        }
    }
}
