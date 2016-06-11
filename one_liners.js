'use strict';

const Sticker = require('./Sticker.js');

/**
 * Stickers and one liner text insults
 * where '%u%' is the username
 * @type {Array.<(string|Sticker)>}
 */
const insults = [
  'ナイトチャットボットが大好き！',
];

/**
 * Returns a random insult
 * @param {string} userName - The user's name who should be insulted
 * @returns {(string|Sticker)} A random insult text or sticker
 */
exports.getRandomInsult = function (userName) {
  const insult = insults[Math.floor(Math.random() * insults.length)];
  if (insult instanceof Sticker) {
    return insult;
  }

  return insult.replace(/%u%/g, userName);
};

