import assert from "assert";
import TelegramBot from "node-telegram-bot-api";
import {inject, singleton} from "tsyringe";
import {AllowlistedReplyStrategy} from "../AllowlistedReplyStrategy";
import {Config} from "../Config";
import {DallEService} from "../DallEService";
import {TelegramService} from "../TelegramService";

/** RegExp for exctracting the image description string. */
const IMAGE_DESCRIPTION_REGEX = /Bild: (.+)$/is;

/**
* Handles messages mentioning the bot (or replying to it) including the text 'Bild:'.
*
* Sends it to DALL·E for image generation.
*/
@singleton()
export class ImageReplyStrategy extends AllowlistedReplyStrategy {
    constructor(
            private readonly dallE: DallEService,
            private readonly telegram: TelegramService,
            @inject('Config') config: Config,
            ) {
        super(config);
    }

    willHandleAllowlisted(message: TelegramBot.Message): boolean {
        if (message.text === undefined) {
            return false;
        }

        if (!message.text.includes(`@${this.config.username}`) && message.reply_to_message?.from?.username !== this.config.username) {
            return false;
        }

        return IMAGE_DESCRIPTION_REGEX.test(message.text);
    }

    handle(message: TelegramBot.Message): void {
        assert(message.text !== undefined);

        // Removing bot name in case it is written behind the description.
        const messageText = message.text.replaceAll(`@${this.config.username}`, '');
        const imageDescriptionMatches = messageText.match(IMAGE_DESCRIPTION_REGEX);
        assert(imageDescriptionMatches && imageDescriptionMatches.length >= 2);
        const imageDescription = imageDescriptionMatches[1].trim();

        this.dallE.generateImage(imageDescription).then(async url => {
            if (!url) {
                await this.telegram.reply('Ich gerade nicht malen.', message);
                return;
            }

            await this.telegram.replyWithImage(url, imageDescription, message);
        });
    }
}
