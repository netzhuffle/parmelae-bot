import TelegramBot from "node-telegram-bot-api";
import {NullReplyStrategy} from "./NullReplyStrategy";
import {ReplyStrategy} from "./ReplyStrategy";
import assert from "assert";
import {singleton} from "tsyringe";
import {StickerIdReplyStrategy} from "./StickerIdReplyStrategy";

/** Finds the ReplyStrategy to handle a given message. */
@singleton()
export class ReplyStrategyFinder {
    /** All possible strategies, in order. One strategy must handle the message. */
    private readonly strategies: ReplyStrategy[];

    constructor(stickerIdReplyStrategy: StickerIdReplyStrategy, nullReplyStrategy: NullReplyStrategy) {
        this.strategies = [stickerIdReplyStrategy, nullReplyStrategy];
    }

    /**
     * Returns the strategy to handle the given message.
     *
     * Will try every strategy in order until one likes to handle it.
     */
    getHandlingStrategy(message: TelegramBot.Message): ReplyStrategy {
        for (const strategy of this.strategies) {
            if (strategy.willHandle(message)) {
                return strategy;
            }
        }

        assert(false, 'There must be a strategy to handle a message');
    }
}
