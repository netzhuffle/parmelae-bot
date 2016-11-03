'use strict';

const Sticker = require('./Sticker');

/**
 * Trigger reply map
 * Key: search RegExp, value: corresponding reply
 * @type {Map}
 */
const replies = new Map([
  [
    /PogChamp/i,
    new Sticker('BQADBAADRwADA3PcAonWVpUYQn7wAg'),
  ],
  [
    /BibleThump/i,
    new Sticker('BQADBAADSQADA3PcAuf5fC5IUsSIAg'),
  ],
  [
    /HeyGuys/i,
    new Sticker('BQADBAADUQADA3PcAsD2jUlwP50BAg'),
  ],
  [
    /4Head/i,
    new Sticker('BQADBAADTwADA3PcAgVaAAGYwr1AIAI'),
  ],
  [
    /ShazBotstix/i,
    new Sticker('BQADBAADVQADA3PcAqRaDEgkvdLoAg'),
  ],
  [
    /SwiftRage/i,
    new Sticker('BQADAgAD8AEAAmqovAHW7GujCT1lnAI'),
  ],
  [
    /Kreygasm/i,
    new Sticker('BQADAgAD3gEAAmqovAFEyUScVyeAAwI'),
  ],
  [
    /Kappa/i,
    new Sticker('BQADAgAD2gEAAmqovAFX0dUOG-jIjgI'),
  ],
  [
    /Keepo/i,
    new Sticker('BQADAgAD3AEAAmqovAEo-y3Y0w0D7AI'),
  ],
]);

/**
 * The triggers
 * @type {Array<RegExp>}
 */
const triggers = [...replies.keys()];

/**
 * Checks if triggers match and returns the according replies
 * @param {string} query - A query text
 * @returns {Array<string|Sticker>} A reply or undefined if query not found
 */
module.exports.search = function (query) {
  const matches = triggers.filter(trigger => trigger.test(query));
  return matches.map(match => replies.get(match));
};
