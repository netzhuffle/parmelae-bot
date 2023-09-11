import { injectable } from 'inversify';
import { CallbackHandler } from './CallbackHandler';
import { TelegramService } from './TelegramService';

/** Creates a callback handler instance. */
@injectable()
export class CallbackHandlerFactory {
  constructor(private readonly telegram: TelegramService) {}

  create(chatId: bigint): CallbackHandler {
    return new CallbackHandler(this.telegram, chatId);
  }
}
