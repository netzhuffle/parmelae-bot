import { DallEService } from '../DallEService.js';
import { DallEPromptGenerator } from '../MessageGenerators/DallEPromptGenerator.js';
import { TelegramService } from '../TelegramService.js';
import { DallETool } from './DallETool.js';
import { injectable } from 'inversify';

@injectable()
export class DallEToolFactory {
  constructor(
    private readonly dallEPromptGenerator: DallEPromptGenerator,
    private readonly dallE: DallEService,
    private readonly telegram: TelegramService,
  ) {}

  /**
   * Creates the DALL-E tool.
   *
   * @param chatId - The chat the image should be sent in.
   */
  create(chatId: bigint): DallETool {
    return new DallETool(
      this.dallEPromptGenerator,
      this.dallE,
      this.telegram,
      chatId,
    );
  }
}
