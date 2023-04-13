import { BaseChatModel } from "langchain/chat_models/base";
import { AIChatMessage, BaseChatMessage } from "langchain/schema";
import { ChatGptService } from "../ChatGptService";
import { GptModelsProvider } from "../GptModelsProvider";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { GitCommitAnnouncementGenerator } from "./GitCommitAnnouncementGenerator";

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
    const chatOpenAiFake = new ChatOpenAiFake(new AIChatMessage('Commit Description'));
    const sut = new GitCommitAnnouncementGenerator(
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

    const response = await sut.generate('git commit message');

    expect(response).toEqual('Commit Description');
    expect(chatOpenAiFake.request).toHaveLength(12);
    expect(chatOpenAiFake.request?.[11].text).toBe('git commit message');
});
