import { injectable } from 'inversify';
import { CallbackHandler } from './CallbackHandler.js';
import { TelegramService } from './TelegramService.js';

/** Creates a callback handler instance. */
@injectable()
export class CallbackHandlerFactory {
  constructor(private readonly telegram: TelegramService) {}

  create(chatId: bigint): CallbackHandler {
    return new CallbackHandler(this.telegram, chatId);
  }
}
