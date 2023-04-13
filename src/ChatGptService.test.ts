import { ChatGptService, UserMessagePromptTemplate } from "./ChatGptService";
import { ChatGptRoles } from "./MessageGenerators/ChatGptMessage";
import { ChatGptModels, GptModelsProvider } from "./GptModelsProvider";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { AIChatMessage, BaseChatMessage, HumanChatMessage, SystemChatMessage } from "langchain/schema";
import { BaseChatModel } from "langchain/chat_models/base";
import {
    AIMessagePromptTemplate,
    ChatPromptTemplate,
    SystemMessagePromptTemplate
} from "langchain/prompts";

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

test('generate message', async () => {
    const chatOpenAiFake = new ChatOpenAiFake(new AIChatMessage('completion'));
    const sut = new ChatGptService(
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
    );
    const prompt = ChatPromptTemplate.fromPromptMessages([
        SystemMessagePromptTemplate.fromTemplate('System Message'),
        AIMessagePromptTemplate.fromTemplate('Assistant Message'),
        UserMessagePromptTemplate.fromNameAndTemplate('Username', '{text}'),
    ]);
    const response = await sut.generate(prompt, ChatGptModels.ChatGpt, {
        text: 'User Message',
    });

    expect(response).toEqual({
        role: ChatGptRoles.Assistant,
        content: 'completion',
    });
    const humanMessage = new HumanChatMessage('User Message');
    humanMessage.name = 'Username';
    expect(chatOpenAiFake.request).toEqual([
        new SystemChatMessage('System Message'),
        new AIChatMessage('Assistant Message'),
        humanMessage,
    ]);
});
