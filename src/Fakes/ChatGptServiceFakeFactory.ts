import { BaseChatModel } from "langchain/chat_models/base";
import { ChatGptService } from "../ChatGptService";
import { BaseChatMessage } from "langchain/schema";
import { GptModelsProvider } from "../GptModelsProvider";

export class ChatOpenAiFake extends BaseChatModel {
    request?: BaseChatMessage[];

    constructor(private readonly response?: BaseChatMessage) {
        super({});
    }

    _llmType() {
        return 'openai-fake'
    }

    _combineLLMOutput() {
        return {};
    }

    async _generate(messages: BaseChatMessage[], stop?: string[]) {
        this.request = messages;

        return {
            generations: this.response ? [
                {
                    text: this.response.text,
                    message: this.response
                }
            ] : [],
        };
    }
}

class FakeToolAsyncFactory {
    create(): Promise<any> {
        return Promise.resolve(undefined as any);
    }
}

class FakeToolFactory {
    create(): any {
        return undefined as any;
    }
}

export class ChatGptServiceFakeFactory {
    static create(gptModelsProvider: GptModelsProvider): ChatGptService {
        return new ChatGptService(
            gptModelsProvider,
            undefined as any,
            undefined as any,
            undefined as any,
            undefined as any,
            undefined as any,
            undefined as any,
            new FakeToolAsyncFactory() as any,
            new FakeToolFactory() as any,
            new FakeToolFactory() as any,
        );
    }
}