import {singleton} from "tsyringe";

/** Adjectives: First word of nickname */
const adjectives = [
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

/** Nouns: Second word of nickname */
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

/** Nickname generation service */
@singleton()
export class Nicknames {
    /** Returns a random nickname */
    getNickname(): string {
        const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];

        return `${adjective} ${noun}`;
    }
}
