import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { BaseMessage } from '@langchain/core/messages';
import { ChatResult } from '@langchain/core/outputs';

export class ChatOpenAiFake extends BaseChatModel {
  request?: BaseMessage[];

  constructor(private readonly response?: BaseMessage) {
    super({});
  }

  _llmType(): string {
    return 'openai-fake';
  }

  _combineLLMOutput(): object {
    return {};
  }

  async _generate(
    messages: BaseMessage[],
    _options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun,
  ): Promise<ChatResult> {
    this.request = messages;
    if (this.response?.text) {
      await runManager?.handleLLMNewToken?.(this.response.text);
    }

    return {
      generations: this.response
        ? [
            {
              text: this.response.text,
              message: this.response,
            },
          ]
        : [],
    };
  }
}
