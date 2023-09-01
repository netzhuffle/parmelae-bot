import { TelegramMessageWithRelations } from './Repositories/Types.js';

/** Handles an incoming message if it likes to. */
export interface ReplyStrategy {
  /**
   * Whether the strategy will handle the message.
   *
   * Will only be called if no other strategy handled the message before.
   */
  willHandle(message: TelegramMessageWithRelations): boolean;

  /**
   * Handle the message.
   *
   * Will only be called if the strategy said it will handle the message.
   */
  handle(message: TelegramMessageWithRelations): Promise<void>;
}
