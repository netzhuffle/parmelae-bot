import {ReplyStrategy} from "../ReplyStrategy";
import TelegramBot from "node-telegram-bot-api";
import {injectable} from "inversify";
import {TelegramService} from "../TelegramService";

/** Adjectives: First word of nickname. */
const ADJECTIVES = [
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
    'Swooping',
];

/** Nouns: Second word of nickname. */
const NOUNS = [
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
    'Charmy',
];

/** Replies with a nickname when the text contains <Spitzname>. */
@injectable()
export class NicknameReplyStrategy implements ReplyStrategy {
    constructor(private readonly telegram: TelegramService) {
    }

    willHandle(message: TelegramBot.Message): boolean {
        return message.text?.includes('<Spitzname>') ?? false;
    }

    handle(message: TelegramBot.Message): Promise<void> {
        const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
        const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];

        return this.telegram.reply(`${adjective} ${noun}`, message);
    }
}
