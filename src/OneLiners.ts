import {Sticker} from './Sticker';
import {singleton} from "tsyringe";

/**
 * Stickers and one liner text
 * where '%u%' is the username
 */
const messages = [
    new Sticker('CAACAgQAAxkBAAEDe-9hHCedKTkqD5q28fNC_QPskmoeggACCQADGzHQB7YWKGObHwqcIAQ'),
    new Sticker('CAACAgQAAxkBAAEDe_FhHChKNUTKx7ClLPi8LnVqgBoWiwACFwADGzHQB5n_p7uFvNX5IAQ'),
    new Sticker('CAACAgQAAxkBAAEDe_NhHChfR2GXOEgazyGQMcBgh3-N2QACIgADGzHQB1MGbzrur3htIAQ'),
    new Sticker('CAACAgQAAxkBAAEDe_lhHCh9Kdw_A0QQb2bFMZ1iXirfswACQAADGzHQBzQQuA1tKXrKIAQ'),
    new Sticker('CAACAgQAAxkBAAEDfAFhHCiX1bMBfca_9nNZD2buqsH2egACSgADGzHQB5xKfgjgIlcIIAQ'),
    new Sticker('CAACAgQAAxkBAAEDfAdhHCivPudpZv2nvYcOywciVkGdNwACPwADmu78Apk-SGoCcKTzIAQ'),
] as (string | Sticker)[];

/** Service to write random text messages or stickers */
@singleton()
export class OneLiners {
    /**
     * Returns a random message
     * @param userName - The user's name who the message should be sent to
     * @returns A random text or sticker
     */
    getRandomMessage(userName: string): string | Sticker {
        const message = messages[Math.floor(Math.random() * messages.length)];
        if (message instanceof Sticker) {
            return message;
        }

        return message.replace(/%u%/g, userName);
    }
}
