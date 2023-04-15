import TelegramBot from 'node-telegram-bot-api';

/** Handles an incoming message if it likes to. */
export interface ReplyStrategy {
  /**
   * Whether the strategy will handle the message.
   *
   * Will only be called if no other strategy handled the message before.
   */
  willHandle(message: TelegramBot.Message): boolean;

  /**
   * Handle the message.
   *
   * Will only be called if the strategy said it will handle the message.
   *
   * @param message - The message to handle
   */
  handle(message: TelegramBot.Message): Promise<void>;
}
