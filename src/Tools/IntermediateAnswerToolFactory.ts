import { Message } from '@prisma/client';
import { TelegramService } from '../TelegramService';
import { injectable } from 'inversify';
import { IntermediateAnswerTool } from './IntermediateAnswerTool';

@injectable()
export class IntermediateAnswerToolFactory {
  constructor(private readonly telegram: TelegramService) {}

  /**
   * Creates the intermediate answer tool.
   *
   * @param forMessage - The message the tool should reply to.
   */
  create(forMessage: Message): IntermediateAnswerTool {
    return new IntermediateAnswerTool(this.telegram, forMessage);
  }
}
