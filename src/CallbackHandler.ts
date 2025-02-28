import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import { TelegramService } from './TelegramService.js';
import { IntermediateAnswerTool } from './Tools/IntermediateAnswerTool.js';
import { ErrorService } from './ErrorService.js';
import { Serialized } from '@langchain/core/load/serializable';

/** Handles LangChain callbacks. */
export class CallbackHandler extends BaseCallbackHandler {
  name = 'CallbackHandler';

  constructor(
    private readonly telegram: TelegramService,
    private readonly chatId: bigint,
  ) {
    super();
  }

  async handleToolStart(
    tool: Serialized,
    input: string,
    _runId: string,
    _parentRunId?: string,
    _tags?: string[],
    _metadata?: Record<string, unknown>,
    runName?: string,
  ): Promise<void> {
    const toolName = runName ?? tool.id[2];

    if (toolName === IntermediateAnswerTool.name) {
      return;
    }

    return this.telegram
      .sendWithoutStoring(`[${toolName}: ${input}]`, this.chatId)
      .then();
  }

  handleLLMError(err: undefined): void {
    ErrorService.log(err);
  }

  handleChainError(err: unknown): void {
    ErrorService.log(err);
  }

  handleToolError(err: unknown): void {
    ErrorService.log(err);
  }

  handleRetrieverError(err: unknown): void {
    ErrorService.log(err);
  }
}
