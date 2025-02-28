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

  _generate(messages: BaseMessage[]): Promise<ChatResult> {
    this.request = messages;

    return Promise.resolve({
      generations: this.response
        ? [
            {
              // eslint-disable-next-line @typescript-eslint/no-deprecated
              text: this.response.text,
              message: this.response,
            },
          ]
        : [],
    });
  }
}
