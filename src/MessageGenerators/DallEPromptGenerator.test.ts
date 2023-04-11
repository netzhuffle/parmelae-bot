import { BaseChatModel } from "langchain/chat_models/base";
import {AIChatMessage, BaseChatMessage } from "langchain/schema";
import { ChatGptService } from "../ChatGptService";
import {DallEPromptGenerator} from "./DallEPromptGenerator";
import {ChatGptModelsProvider} from "../ChatGptModelsProvider";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { CallbackManager } from "langchain/callbacks";

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
    const chatOpenAiFake = new ChatOpenAiFake(new AIChatMessage('DALL-E description'));
    const sut = new DallEPromptGenerator(new ChatGptService(new ChatGptModelsProvider({
        chatGpt: chatOpenAiFake as unknown as ChatOpenAI,
        gpt4: new ChatOpenAiFake() as unknown as ChatOpenAI,
    }), undefined as unknown as CallbackManager));
    
    const response = await sut.generate('image description');

    expect(response).toEqual('DALL-E description');
    expect(chatOpenAiFake.request).toHaveLength(6);
    expect(chatOpenAiFake.request?.[5].text).toBe('image description');
});
