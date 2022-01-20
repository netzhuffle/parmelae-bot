'use strict';

/**
 * Adjectives: First word of nickname
 * @type {Array.<string>}
 */
let adjectives = [
    'Gummy',
    'Pink',
    'Pink',
    'Pink',
    'Jelly',
    'Funny',
    'Cute',
    'Sweet',
    'Double',
    'Juicy',
    'Icy',
    'Angel',
    'Gummy',
    'Quarter',
    '90 %',
    'Junior',
    'Hot',
    'Swiss',
    'Muffin',
    'Butter',
    'Chicken',
    'Baby',
    'Unicorn',
    'Sugar',
    'Honey',
    'Toffee',
    'Berry',
    'Itsy Bitsy',
    'Lil',
    'Swooping'
];

/**
 * Nouns: Second word of nickname
 * @type {Array.<string>}
 */
let nouns = [
    'Worm',
    'Bear',
    'Unicorn',
    'Unicorn',
    'Pinky',
    'Pinky',
    'Pinky',
    'Peach',
    'Roll',
    'Gum',
    'Stardust',
    'Marshmallow',
    'Baby',
    'Gummy',
    'Budding',
    'Twix',
    'Snickers',
    'WTF',
    'Cookie',
    'Cake',
    'Niffler',
    'Swooping Evil',
    'Evil',
    'Carrot',
    'Lady',
    'Lady',
    'Pimpkin',
    'Pie',
    'Kitty',
    'Mouse',
    'Rabbit',
    'Otter',
    'Beauty',
    'Snow White',
    'Bee',
    'Bug',
    'Grasshopper',
    'Occamy',
    'Ponny',
    'Powny',
    'Wonwon',
    'Lavender',
    'Tinkerbell',
    'Bluebell',
    'Lovely',
    'Chiquitita',
    'Face',
    'Snuggles',
    'Charmy'
];

export default {
    /**
     * Returns a random nickname
     * @returns {string} A random nickname
     */
    getNickname: function () {
        var adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        var noun = nouns[Math.floor(Math.random() * nouns.length)];

        return `${adjective} ${noun}`;
    }
};

