'use strict';

import {Sticker} from './Sticker';

/**
 * Stickers and one liner text insults
 * where '%u%' is the username
 * @type {Array.<(string|Sticker)>}
 */
const insults = [
    new Sticker('CAACAgQAAxkBAAEDe-9hHCedKTkqD5q28fNC_QPskmoeggACCQADGzHQB7YWKGObHwqcIAQ'),
    new Sticker('CAACAgQAAxkBAAEDe_FhHChKNUTKx7ClLPi8LnVqgBoWiwACFwADGzHQB5n_p7uFvNX5IAQ'),
    new Sticker('CAACAgQAAxkBAAEDe_NhHChfR2GXOEgazyGQMcBgh3-N2QACIgADGzHQB1MGbzrur3htIAQ'),
    new Sticker('CAACAgQAAxkBAAEDe_lhHCh9Kdw_A0QQb2bFMZ1iXirfswACQAADGzHQBzQQuA1tKXrKIAQ'),
    new Sticker('CAACAgQAAxkBAAEDfAFhHCiX1bMBfca_9nNZD2buqsH2egACSgADGzHQB5xKfgjgIlcIIAQ'),
    new Sticker('CAACAgQAAxkBAAEDfAdhHCivPudpZv2nvYcOywciVkGdNwACPwADmu78Apk-SGoCcKTzIAQ'),
];

export default {
    /**
     * Returns a random insult
     * @param {string} userName - The user's name who should be insulted
     * @returns {(string|Sticker)} A random insult text or sticker
     */
    getRandomInsult: function (userName) {
        const insult = insults[Math.floor(Math.random() * insults.length)];
        if (insult instanceof Sticker) {
            return insult;
        }

        return insult.replace(/%u%/g, userName);
    }
};

