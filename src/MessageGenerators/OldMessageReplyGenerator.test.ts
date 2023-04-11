import {BaseChatModel} from "langchain/chat_models/base";
import {AIChatMessage, BaseChatMessage} from "langchain/schema";
import {ChatGptService} from "../ChatGptService";
import {ChatGptModelsProvider} from "../ChatGptModelsProvider";
import {ChatOpenAI} from "langchain/chat_models/openai";
import {CallbackManager} from "langchain/callbacks";
import {OldMessageReplyGenerator} from "./OldMessageReplyGenerator";

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
    const chatOpenAiFake = new ChatOpenAiFake(new AIChatMessage('Reply'));
    const sut = new OldMessageReplyGenerator(new ChatGptService(new ChatGptModelsProvider({
        chatGpt: chatOpenAiFake as unknown as ChatOpenAI,
        gpt4: new ChatOpenAiFake() as unknown as ChatOpenAI,
    }), undefined as unknown as CallbackManager));

    const response = await sut.generate('old message');

    expect(response).toEqual('Reply');
    expect(chatOpenAiFake.request).toHaveLength(16);
    expect(chatOpenAiFake.request?.[15].text).toBe('old message');
});
