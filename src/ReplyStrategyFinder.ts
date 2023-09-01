import { NullReplyStrategy } from './ReplyStrategies/NullReplyStrategy.js';
import { ReplyStrategy } from './ReplyStrategy.js';
import assert from 'assert';
import { injectable } from 'inversify';
import { StickerIdReplyStrategy } from './ReplyStrategies/StickerIdReplyStrategy.js';
import { NewMembersReplyStrategy } from './ReplyStrategies/NewMembersReplyStrategy.js';
import { CommandReplyStrategy } from './ReplyStrategies/CommandReplyStrategy.js';
import { BotMentionReplyStrategy } from './ReplyStrategies/ BotMentionReplyStrategy.js';
import { MessageRepetitionReplyStrategy } from './ReplyStrategies/MessageRepetitionReplyStrategy.js';
import { NicknameReplyStrategy } from './ReplyStrategies/NicknameReplyStrategy.js';
import { RandomizedGeneratedReplyStrategy } from './ReplyStrategies/RandomizedGeneratedReplyStrategy.js';
import { RandomizedStickerReplyStrategy } from './ReplyStrategies/RandomizedStickerReplyStrategy.js';
import { CommentReplyStrategy } from './ReplyStrategies/CommentReplyStrategy.js';
import { TelegramMessageWithRelations } from './Repositories/Types.js';

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
  getHandlingStrategy(message: TelegramMessageWithRelations): ReplyStrategy {
    for (const strategy of this.strategies) {
      if (strategy.willHandle(message)) {
        return strategy;
      }
    }

    assert(false, 'There must be a strategy to handle a message');
  }
}
