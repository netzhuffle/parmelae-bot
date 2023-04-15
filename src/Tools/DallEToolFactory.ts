import TelegramBot from 'node-telegram-bot-api';
import { DallEService } from '../DallEService';
import { DallEPromptGenerator } from '../MessageGenerators/DallEPromptGenerator';
import { TelegramService } from '../TelegramService';
import { DallETool } from './DallETool';
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
   * @param forMessage - The message the DALL-E tool should reply to
   */
  create(forMessage: TelegramBot.Message): DallETool {
    return new DallETool(
      this.dallEPromptGenerator,
      this.dallE,
      this.telegram,
      forMessage,
    );
  }
}
