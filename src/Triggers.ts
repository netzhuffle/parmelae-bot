'use strict';

import {Sticker} from './Sticker';
import {singleton} from "tsyringe";

/**
 * Trigger reply map
 * Key: search RegExp, value: corresponding reply
 */
const replies = new Map<RegExp, string | Sticker>([
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
        new Sticker('BQADAQADowADObDtBTtlb93L3s8qAg'),
    ],
    [
        /Kreygasm/i,
        new Sticker('BQADAQADzwADObDtBZeZpn9zkazLAg'),
    ],
    [
        /Kappa/i,
        new Sticker('BQADAQADGwADObDtBYvEvLz-j3q-Ag'),
    ],
    [
        /FailFish/i,
        new Sticker('BQADAQADngADObDtBeUbVNB4kV6oAg'),
    ],
    [
        /NotLikeThis/i,
        new Sticker('BQADAQADLwADObDtBQdMrRY67IxCAg'),
    ],
    [
        /NomNom/i,
        new Sticker('BQADAQADnQEAAjmw7QX_YWZsHQzazwI'),
    ],

]);

/**
 * The triggers
 * @type {Array<RegExp>}
 */
const triggers = [...replies.keys()];

/** Trigger service class that replies with specific messages on RegEx match */
@singleton()
export class Triggers {
    /**
     * Checks if triggers match and returns the according replies
     * @param query - A query text
     * @return A reply or undefined if query not found
     */
    search(query: string): (string | Sticker)[] {
        const matches = triggers.filter(trigger => trigger.test(query));
        return matches.map(match => replies.get(match) ?? '');
    }
}
