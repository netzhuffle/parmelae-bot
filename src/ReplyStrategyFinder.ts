import TelegramBot from "node-telegram-bot-api";
import {NullReplyStrategy} from "./ReplyStrategies/NullReplyStrategy";
import {ReplyStrategy} from "./ReplyStrategy";
import assert from "assert";
import {singleton} from "tsyringe";
import {StickerIdReplyStrategy} from "./ReplyStrategies/StickerIdReplyStrategy";
import {NewMembersReplyStrategy} from "./ReplyStrategies/NewMembersReplyStrategy";
import {CommandReplyStrategy} from "./ReplyStrategies/CommandReplyStrategy";
import {WitReplyStrategy} from "./ReplyStrategies/WitReplyStrategy";
import {MessageRepetitionReplyStrategy} from "./ReplyStrategies/MessageRepetitionReplyStrategy";
import {NicknameReplyStrategy} from "./ReplyStrategies/NicknameReplyStrategy";
import {RandomizedGpt3ReplyStrategy} from "./ReplyStrategies/RandomizedGpt3ReplyStrategy";
import {RandomizedStickerReplyStrategy} from "./ReplyStrategies/RandomizedStickerReplyStrategy";

/** Finds the ReplyStrategy to handle a given message. */
@singleton()
export class ReplyStrategyFinder {
    /** All possible strategies, in order. One strategy must handle the message. */
    private readonly strategies: ReplyStrategy[];

    constructor(
        stickerIdReplyStrategy: StickerIdReplyStrategy,
        newMembersReplyStrategy: NewMembersReplyStrategy,
        commandReplyStrategy: CommandReplyStrategy,
        witReplyStrategy: WitReplyStrategy,
        messageRepetitionReplyStrategy: MessageRepetitionReplyStrategy,
        nicknameReplyStrategy: NicknameReplyStrategy,
        randomizedGpt3ReplyStrategy: RandomizedGpt3ReplyStrategy,
        randomizedStickerReplyStrategy: RandomizedStickerReplyStrategy,
        nullReplyStrategy: NullReplyStrategy
    ) {
        this.strategies = [
            // Replies with Sticker file_id in private chats.
            stickerIdReplyStrategy,

            // Welcomes new chat members.
            newMembersReplyStrategy,

            // Executes commands written as /xyz@BotName in allowlisted chats.
            commandReplyStrategy,

            // Handles messages mentioning the bot in allowlisted chats by sending them to Wit for handling.
            witReplyStrategy,

            // Repeats a message that two other users wrote.
            messageRepetitionReplyStrategy,

            // Replies with a nickname when the text contains <Spitzname>.
            nicknameReplyStrategy,

            // Picks a message by random chance to reply with GPT-3.
            randomizedGpt3ReplyStrategy,

            // Picks a message by random chance to reply with a random sticker.
            randomizedStickerReplyStrategy,

            // Do nothing (catch all last rule).
            nullReplyStrategy
        ];
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
