import {ReplyStrategy} from "../ReplyStrategy";
import TelegramBot from "node-telegram-bot-api";
import {injectable} from "inversify";
import {Sticker} from "../Sticker";
import {TelegramService} from "../TelegramService";

/** How likely the bot randomly replies to a message. 1 = 100%. */
const RANDOM_REPLY_PROBABILITY = 0.00035;

/** Possible stickers. */
const STICKERS = [
    new Sticker('CAACAgQAAxkBAAEDe-9hHCedKTkqD5q28fNC_QPskmoeggACCQADGzHQB7YWKGObHwqcIAQ'),
    new Sticker('CAACAgQAAxkBAAEDe_FhHChKNUTKx7ClLPi8LnVqgBoWiwACFwADGzHQB5n_p7uFvNX5IAQ'),
    new Sticker('CAACAgQAAxkBAAEDe_NhHChfR2GXOEgazyGQMcBgh3-N2QACIgADGzHQB1MGbzrur3htIAQ'),
    new Sticker('CAACAgQAAxkBAAEDe_lhHCh9Kdw_A0QQb2bFMZ1iXirfswACQAADGzHQBzQQuA1tKXrKIAQ'),
    new Sticker('CAACAgQAAxkBAAEDfAFhHCiX1bMBfca_9nNZD2buqsH2egACSgADGzHQB5xKfgjgIlcIIAQ'),
    new Sticker('CAACAgQAAxkBAAEDfAdhHCivPudpZv2nvYcOywciVkGdNwACPwADmu78Apk-SGoCcKTzIAQ'),
];

/** Picks a message by random chance to reply with a random sticker. */
@injectable()
export class RandomizedStickerReplyStrategy implements ReplyStrategy {
    constructor(private readonly telegram: TelegramService) {
    }

    willHandle(message: TelegramBot.Message): boolean {
        return message.from !== undefined && Math.random() < RANDOM_REPLY_PROBABILITY;
    }

    handle(message: TelegramBot.Message): Promise<void> {
        const sticker = STICKERS[Math.floor(Math.random() * STICKERS.length)];
        return this.telegram.reply(sticker, message);
    }
}
