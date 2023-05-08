import { BaseCallbackHandler } from 'langchain/callbacks';
import { TelegramService } from './TelegramService';
import { AgentAction } from 'langchain/schema';
import { IntermediateAnswerTool } from './Tools/IntermediateAnswerTool';

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
    if (action.tool === IntermediateAnswerTool.name) {
      return;
    }

    return this.telegram
      .sendWithoutStoring(`[${action.tool}: ${action.toolInput}]`, this.chatId)
      .then();
  }
}
