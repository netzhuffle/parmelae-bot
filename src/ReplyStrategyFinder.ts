import TelegramBot from "node-telegram-bot-api";
import {NullReplyStrategy} from "./ReplyStrategies/NullReplyStrategy";
import {ReplyStrategy} from "./ReplyStrategy";
import assert from "assert";
import {injectable} from "inversify";
import {StickerIdReplyStrategy} from "./ReplyStrategies/StickerIdReplyStrategy";
import {NewMembersReplyStrategy} from "./ReplyStrategies/NewMembersReplyStrategy";
import {CommandReplyStrategy} from "./ReplyStrategies/CommandReplyStrategy";
import {BotMentionReplyStrategy} from "./ReplyStrategies/ BotMentionReplyStrategy";
import {MessageRepetitionReplyStrategy} from "./ReplyStrategies/MessageRepetitionReplyStrategy";
import {NicknameReplyStrategy} from "./ReplyStrategies/NicknameReplyStrategy";
import {RandomizedGeneratedReplyStrategy} from "./ReplyStrategies/RandomizedGeneratedReplyStrategy";
import {RandomizedStickerReplyStrategy} from "./ReplyStrategies/RandomizedStickerReplyStrategy";
import {CommentReplyStrategy} from "./ReplyStrategies/CommentReplyStrategy";

/** Finds the ReplyStrategy to handle a given message. */
@injectable()
export class ReplyStrategyFinder {
    /** All possible strategies, in order. One strategy must handle the message. */
    private readonly strategies: readonly ReplyStrategy[];

    constructor(
        stickerIdReplyStrategy: StickerIdReplyStrategy,
        newMembersReplyStrategy: NewMembersReplyStrategy,
        commentReplyStrategy: CommentReplyStrategy,
        commandReplyStrategy: CommandReplyStrategy,
        botMentionReplyStrategy: BotMentionReplyStrategy,
        messageRepetitionReplyStrategy: MessageRepetitionReplyStrategy,
        nicknameReplyStrategy: NicknameReplyStrategy,
        randomizedGeneratedReplyStrategy: RandomizedGeneratedReplyStrategy,
        randomizedStickerReplyStrategy: RandomizedStickerReplyStrategy,
        nullReplyStrategy: NullReplyStrategy,
    ) {
        this.strategies = [
            // Replies with Sticker file_id in private chats.
            stickerIdReplyStrategy,

            // Welcomes new chat members.
            newMembersReplyStrategy,

            // Comments a message when somebody replies with (just) the bot’s name.
            commentReplyStrategy,

            // Executes commands written as /xyz@BotName in allowlisted chats.
            commandReplyStrategy,

            // Handles messages mentioning or replying to the bot in allowlisted chats.
            botMentionReplyStrategy,

            // Repeats a message that two other users wrote.
            messageRepetitionReplyStrategy,

            // Replies with a nickname when the text contains <Spitzname>.
            nicknameReplyStrategy,

            // Picks a message by random chance to reply with a generated message.
            randomizedGeneratedReplyStrategy,

            // Picks a message by random chance to reply with a random sticker.
            randomizedStickerReplyStrategy,

            // Do nothing (catch all last rule).
            nullReplyStrategy,
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
