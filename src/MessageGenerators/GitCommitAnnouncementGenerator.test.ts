import {BaseChatModel} from "langchain/chat_models/base";
import {AIChatMessage, BaseChatMessage} from "langchain/schema";
import {ChatGptService} from "../ChatGptService";
import {ChatGptModelsProvider} from "../ChatGptModelsProvider";
import {ChatOpenAI} from "langchain/chat_models/openai";
import {GitCommitAnnouncementGenerator} from "./GitCommitAnnouncementGenerator";

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


test('generate', async () => {
    const chatOpenAiFake = new ChatOpenAiFake(new AIChatMessage('Commit Description'));
    const sut = new GitCommitAnnouncementGenerator(
        new ChatGptService(
            new ChatGptModelsProvider(
                {
                    chatGpt: chatOpenAiFake as unknown as ChatOpenAI,
                    chatGptStrict: new ChatOpenAiFake() as unknown as ChatOpenAI,
                    gpt4: new ChatOpenAiFake() as unknown as ChatOpenAI,
                }),
            undefined as any,
            undefined as any,
            undefined as any,
            undefined as any,
            undefined as any,
            undefined as any,
        )
    );

    const response = await sut.generate('git commit message');

    expect(response).toEqual('Commit Description');
    expect(chatOpenAiFake.request).toHaveLength(12);
    expect(chatOpenAiFake.request?.[11].text).toBe('git commit message');
});
