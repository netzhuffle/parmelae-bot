import { TelegramService } from '../TelegramService.js';
import { Tool } from '@langchain/core/tools';

export const INTERMEDIATE_ANSWER_TOOL_NAME = 'intermediate-answer';

export class IntermediateAnswerTool extends Tool {
  name = INTERMEDIATE_ANSWER_TOOL_NAME;

  description =
    'To send a message to the telegram chat that is not your final answer to the query. Input is the text to send. Use before using a slow tool (by example minecraft-stop or dall-e) or just to say what you will do next (like a Google Search or visit a website) without stopping what you are doing yet.';

  constructor(
    private readonly telegram: TelegramService,
    private readonly chatId: bigint,
  ) {
    super();
  }

  protected async _call(arg: string): Promise<string> {
    try {
      await this.telegram.send(arg, this.chatId);
    } catch {
      return 'Error: Could not send text to telegram';
    }
    return 'Successfully sent the text to the telegram chat';
  }
}
