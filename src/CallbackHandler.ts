import { BaseCallbackHandler } from 'langchain/callbacks';
import { TelegramService } from './TelegramService';
import { AgentAction, ChainValues } from 'langchain/schema';
import { IntermediateAnswerTool } from './Tools/IntermediateAnswerTool';
import { assert } from 'console';
import { ErrorService } from './ErrorService';

/** Handles LangChain callbacks. */
export class CallbackHandler extends BaseCallbackHandler {
  name = 'CallbackHandler';
  readonly fullTextPromise: Promise<string>;
  private resolveFullText: (value: string) => void;

  constructor(
    private readonly telegram: TelegramService,
    private readonly chatId: bigint,
  ) {
    super();
    this.resolveFullText = () => {
      // Overridden below.
    };
    this.fullTextPromise = new Promise((resolve) => {
      this.resolveFullText = resolve;
    });
  }

  async handleAgentAction(action: AgentAction): Promise<void> {
    if (action.tool === IntermediateAnswerTool.toolName) {
      return;
    }

    return this.telegram
      .sendWithoutStoring(`[${action.tool}: ${action.toolInput}]`, this.chatId)
      .then();
  }

  handleChainEnd(outputs: ChainValues): void {
    if (outputs.text) {
      assert(typeof outputs.text === 'string');
      this.resolveFullText(outputs.text as string);
    }
  }

  handleToolError(err: unknown): void {
    ErrorService.log(err);
  }

  handleChainError(err: unknown): void {
    ErrorService.log(err);
  }

  handleLLMError(err: undefined): void {
    ErrorService.log(err);
  }
}
