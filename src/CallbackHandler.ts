import { BaseCallbackHandler } from 'langchain/callbacks';
import { TelegramService } from './TelegramService';
import { AgentAction } from 'langchain/schema';

/** Handles LangChain callbacks. */
export class CallbackHandler extends BaseCallbackHandler {
  name = 'CallbackHandler';

  constructor(
    private readonly telegram: TelegramService,
    private readonly chatId: bigint,
  ) {
    super();
  }

  async handleAgentAction(action: AgentAction): Promise<void> {
    return this.telegram
      .sendWithoutStoring(`[${action.tool}: ${action.toolInput}]`, this.chatId)
      .then();
  }
}
