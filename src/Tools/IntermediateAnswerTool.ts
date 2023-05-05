import { TelegramService } from '../TelegramService';
import { Tool } from 'langchain/tools';

export class IntermediateAnswerTool extends Tool {
  name = 'intermediate-answer';

  description = `To send a message to the telegram chat that is not your final answer to the query. Input is the text to send.
Use before using a slow tool (by example minecraft-backup or dall-e) or just to say what you will do next (like a Google Search or visit a website) without stopping what you are doing yet.
Remember: To send your final answer to telegram, you must use the "Final Answer" action instead of this tool.`;

  constructor(
    private readonly telegram: TelegramService,
    private readonly chatId: bigint,
  ) {
    super();
  }

  protected async _call(arg: string): Promise<string> {
    try {
      await this.telegram.send(arg, this.chatId);
    } catch (e) {
      return 'Error: Could not send text to telegram';
    }
    return 'Successfully sent the text to the telegram chat';
  }
}
