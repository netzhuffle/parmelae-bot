import { injectable } from 'inversify';
import { TelegramService } from '../TelegramService.js';
import { DiceTool } from './DiceTool.js';

@injectable()
export class DiceToolFactory {
  constructor(private readonly telegram: TelegramService) {}

  /**
   * Creates the dice tool.
   *
   * @param chatId - The chat to send the dice animation in.
   */
  create(chatId: bigint): DiceTool {
    return new DiceTool(this.telegram, chatId);
  }
}
