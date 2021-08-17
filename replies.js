'use strict';

const FuzzySet = require('fuzzyset.js');
const Sticker = require('./Sticker');

/**
 * Insult reply map
 * Key: insult, value: corresponding reply
 * @type {Map}
 */
const insults = new Map([
    [
        '❤️',
        [new Sticker('BQADBAADLgADA3PcAuCVGZCipKVwAg')],
    ],
]);

/**
 * FuzzySet with insult replies
 * @type {Object}
 */
const fuzzy = FuzzySet([...insults.keys()]);

/**
 * Checks if the query is found and returns an according reply
 * @param {string} query - A query text
 * @returns {(string|Sticker|undefined)} A reply or undefined if query not found
 */
module.exports.search = function (query) {
    let match = fuzzy.get(query);
    if (!match) {
        return;
    }

    let score = match[0][0];
    if (score > 0.5) {
        let result = match[0][1];
        let possibleCounters = insults.get(result);
        return possibleCounters[Math.floor(Math.random() * possibleCounters.length)];
    }
};

