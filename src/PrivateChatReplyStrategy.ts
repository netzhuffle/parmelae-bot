import { injectable } from 'inversify';
import { ReplyStrategy } from './ReplyStrategy';
import { Message } from '@prisma/client';
import { MessageWithRelations } from './Repositories/Types';

/** Abstract ReplyStrategy for private chats only */
@injectable()
export abstract class PrivateChatReplyStrategy implements ReplyStrategy {
  willHandle(message: MessageWithRelations): boolean {
    if (message.chat.type !== 'private') {
      return false;
    }

    return this.willHandlePrivate(message);
  }

  /**
   * Whether the strategy will handle the message in a private chat.
   *
   * Will only be called if no other strategy handled the message before and if the message is in a private chat with
   * the bot.
   */
  abstract willHandlePrivate(message: Message): boolean;

  abstract handle(message: Message): Promise<void>;
}
