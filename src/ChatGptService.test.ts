import {ChatCompletionRequestMessageRoleEnum} from "openai/dist/api";
import {ChatGptService, UserMessagePromptTemplate} from "./ChatGptService";
import {ChatGptMessage, ChatGptRoles} from "./MessageGenerators/ChatGptMessage";
import {ChatGptModels, ChatGptModelsProvider} from "./ChatGptModelsProvider";
import {ChatOpenAI} from "langchain/chat_models/openai";
import {AIChatMessage, BaseChatMessage, HumanChatMessage, SystemChatMessage} from "langchain/schema";
import {BaseChatModel} from "langchain/chat_models/base";
import {CallbackManager} from "langchain/callbacks";
import {
    AIMessagePromptTemplate,
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
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

test('generate message', async () => {
    const chatOpenAiFake = new ChatOpenAiFake(new AIChatMessage('completion'));
    const sut = new ChatGptService(new ChatGptModelsProvider({
        chatGpt: chatOpenAiFake as unknown as ChatOpenAI,
        gpt4: new ChatOpenAiFake() as unknown as ChatOpenAI,
    }), undefined as unknown as CallbackManager);
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

test('generate ChatGPT completion', async () => {
    const chatOpenAiFake = new ChatOpenAiFake(new AIChatMessage('completion'));
    const sut = new ChatGptService(new ChatGptModelsProvider({
        chatGpt: chatOpenAiFake as unknown as ChatOpenAI,
        gpt4: new ChatOpenAiFake() as unknown as ChatOpenAI,
    }), undefined as unknown as CallbackManager);
    const requestMessages: ChatGptMessage[] = [
        {
            role: ChatGptRoles.System,
            content: 'System Message',
        },
        {
            role: ChatGptRoles.Assistant,
            content: 'Assistant Message',
        },
        {
            role: ChatGptRoles.User,
            content: 'User Message',
            name: 'Username',
        },
    ];

    const response = await sut.generateMessage(requestMessages);

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

test('generate GPT-4 completion', async () => {
    const chatOpenAiFake = new ChatOpenAiFake(new AIChatMessage('completion'));
    const sut = new ChatGptService(new ChatGptModelsProvider({
        chatGpt: new ChatOpenAiFake() as unknown as ChatOpenAI,
        gpt4: chatOpenAiFake as unknown as ChatOpenAI,
    }), undefined as unknown as CallbackManager);
    const requestMessages: ChatGptMessage[] = [
        {
            role: ChatCompletionRequestMessageRoleEnum.System,
            content: 'System Message',
        },
        {
            role: ChatGptRoles.User,
            content: '4: User Message 1',
            name: 'Username 1',
        },
        {
            role: ChatGptRoles.User,
            content: '4: User Message 2',
            name: 'Username 2',
        },
    ];

    const response = await sut.generateMessage(requestMessages);

    expect(response).toEqual({
        role: ChatGptRoles.Assistant,
        content: 'completion',
    });
    const humanMessage1 = new HumanChatMessage('User Message 1');
    humanMessage1.name = 'Username 1';
    const humanMessage2 = new HumanChatMessage('User Message 2');
    humanMessage2.name = 'Username 2';
    expect(chatOpenAiFake.request).toEqual([
        new SystemChatMessage('System Message'),
        humanMessage1,
        humanMessage2,
    ]);
});
