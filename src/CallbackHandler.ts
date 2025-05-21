import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import { ErrorService } from './ErrorService.js';

/** Handles LangChain callbacks. */
export class CallbackHandler extends BaseCallbackHandler {
  name = 'CallbackHandler';

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
