import {ReplyFunction, ReplyStrategy} from "./ReplyStrategy";
import TelegramBot from "node-telegram-bot-api";
import {singleton} from "tsyringe";
import assert from "assert";

/** Reply with a Sticker file_id when Sticker sent in private chat. */
@singleton()
export class StickerIdReplyStrategy implements ReplyStrategy {
    willHandle(message: TelegramBot.Message): boolean {
        return message.chat.type === 'private' && message.sticker != undefined;
    }

    handle(message: TelegramBot.Message, reply: ReplyFunction) {
        assert(message.sticker != undefined);

        reply('Sticker file_id: ' + message.sticker.file_id, message);
    }
}
