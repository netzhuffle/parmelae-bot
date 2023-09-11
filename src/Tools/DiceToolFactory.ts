import { injectable } from 'inversify';
import { TelegramService } from '../TelegramService';
import { DiceTool } from './DiceTool';

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
