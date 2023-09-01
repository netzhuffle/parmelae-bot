import { TelegramService } from '../TelegramService.js';
import { injectable } from 'inversify';
import { IntermediateAnswerTool } from './IntermediateAnswerTool.js';

@injectable()
export class IntermediateAnswerToolFactory {
  constructor(private readonly telegram: TelegramService) {}

  /**
   * Creates the intermediate answer tool.
   *
   * @param chatId - The chat to write in.
   */
  create(chatId: bigint): IntermediateAnswerTool {
    return new IntermediateAnswerTool(this.telegram, chatId);
  }
}
