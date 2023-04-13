import { BaseChatModel } from "langchain/chat_models/base";
import { AIChatMessage, BaseChatMessage } from "langchain/schema";
import { ChatGptService } from "../ChatGptService";
import { DallEPromptGenerator } from "./DallEPromptGenerator";
import { GptModelsProvider } from "../GptModelsProvider";
import { ChatOpenAI } from "langchain/chat_models/openai";

class ChatOpenAiFake extends BaseChatModel {
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

class FakeToolProvider {
    get(): Promise<any> {
        return Promise.resolve(undefined as any);
    }
}


test('generate', async () => {
    const chatOpenAiFake = new ChatOpenAiFake(new AIChatMessage('DALL-E description'));
    const sut = new DallEPromptGenerator(
        new ChatGptService(
            new GptModelsProvider(
                {
                    chatGpt: chatOpenAiFake as unknown as ChatOpenAI,
                    chatGptStrict: undefined as any,
                    gpt4: undefined as any,
                    embeddings: undefined as any,
                }),
            undefined as any,
            undefined as any,
            undefined as any,
            undefined as any,
            undefined as any,
            undefined as any,
            new FakeToolProvider() as any,
        )
    );

    const response = await sut.generate('image description');

    expect(response).toEqual('DALL-E description');
    expect(chatOpenAiFake.request).toHaveLength(6);
    expect(chatOpenAiFake.request?.[5].text).toBe('image description');
});
