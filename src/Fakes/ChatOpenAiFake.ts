import { BaseChatModel } from 'langchain/chat_models/base';
import { BaseChatMessage, ChatResult } from 'langchain/schema';

export class ChatOpenAiFake extends BaseChatModel {
  request?: BaseChatMessage[];

  constructor(private readonly response?: BaseChatMessage) {
    super({});
  }

  _llmType(): string {
    return 'openai-fake';
  }

  _combineLLMOutput(): object {
    return {};
  }

  _generate(messages: BaseChatMessage[]): Promise<ChatResult> {
    this.request = messages;

    return Promise.resolve({
      generations: this.response
        ? [
            {
              text: this.response.text,
              message: this.response,
            },
          ]
        : [],
    });
  }
}
