import TelegramBot from "node-telegram-bot-api";
import {singleton} from "tsyringe";
import assert from "assert";
import {PrivateChatReplyStrategy} from "../PrivateChatReplyStrategy";
import {TelegramService} from "../TelegramService";

/** Reply with a Sticker file_id when Sticker sent in private chat. */
@singleton()
export class StickerIdReplyStrategy extends PrivateChatReplyStrategy {
    constructor(private readonly telegram: TelegramService) {
        super();
    }

    willHandlePrivate(message: TelegramBot.Message): boolean {
        return message.sticker !== undefined;
    }

    handle(message: TelegramBot.Message) {
        assert(message.sticker !== undefined);

        this.telegram.reply('Sticker file_id: ' + message.sticker.file_id, message);
    }
}
