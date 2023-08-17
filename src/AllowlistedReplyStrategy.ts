import { ReplyStrategy } from './ReplyStrategy';
import { Config } from './Config';
import { injectable } from 'inversify';
import {
  TelegramMessageWithRelations,
  TelegramMessageWithReplyTo,
} from './Repositories/Types';

/** Abstract ReplyStrategy for allowlisted chats and allowlisted private message senders only */
@injectable()
export abstract class AllowlistedReplyStrategy implements ReplyStrategy {
  constructor(protected readonly config: Config) {}

  willHandle(message: TelegramMessageWithRelations): boolean {
    if (!this.config.chatAllowlist.includes(message.chatId)) {
      return false;
    }

    return this.willHandleAllowlisted(message);
  }

  /**
   * Whether the strategy will handle the message in an allowlisted chat or allowlisted private message sender.
   *
   * Will only be called if no other strategy handled the message before and if the message is in an allowlisted chat
   * or if the private message sender is allowlisted.
   */
  abstract willHandleAllowlisted(
    message: TelegramMessageWithRelations,
  ): boolean;

  abstract handle(message: TelegramMessageWithReplyTo): Promise<void>;
}
