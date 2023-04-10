import {
    ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum,
    ChatCompletionResponseMessageRoleEnum, OpenAIApi
} from "openai/dist/api";
import {ChatGptService} from "./ChatGptService";
import {ChatGptMessage, ChatGptRoles} from "./MessageGenerators/ChatGptMessage";
import {ChatGptModels} from "./ChatGptModels";
import {ChatOpenAI} from "langchain/chat_models/openai";
import {AIChatMessage, HumanChatMessage, SystemChatMessage} from "langchain/schema";

const requestResponse = {
    request: {} as object,
    response: {} as object,
};
const chatOpenAiFake = {
    request: {},
    response: {},
    call: async (request: object) => {
        requestResponse.request = request;
        return requestResponse.response;
    },
} as unknown as ChatOpenAI;
const chatGptModels = new ChatGptModels({
    chatGpt: chatOpenAiFake,
    gpt4: chatOpenAiFake,
});

beforeEach(() => {
    requestResponse.request = {};
    requestResponse.response = {};
});

test('generate ChatGPT completion', async () => {
    const sut = new ChatGptService(chatGptModels);
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
    requestResponse.response = new AIChatMessage('completion');

    const response = await sut.generateMessage(requestMessages);

    expect(response).toEqual({
        role: ChatGptRoles.Assistant,
        content: 'completion',
    });
    const humanMessage = new HumanChatMessage('User Message');
    humanMessage.name = 'Username';
    expect(requestResponse.request).toEqual([
        new SystemChatMessage('System Message'),
        new AIChatMessage('Assistant Message'),
        humanMessage,
    ]);
});

test('generate GPT-4 completion', async () => {
    const sut = new ChatGptService(chatGptModels);
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
    requestResponse.response = new AIChatMessage('completion');

    const response = await sut.generateMessage(requestMessages);

    expect(response).toEqual({
        role: ChatGptRoles.Assistant,
        content: 'completion',
    });
    const humanMessage1 = new HumanChatMessage('User Message 1');
    humanMessage1.name = 'Username 1';
    const humanMessage2 = new HumanChatMessage('User Message 2');
    humanMessage2.name = 'Username 2';
    expect(requestResponse.request).toEqual([
        new SystemChatMessage('System Message'),
        humanMessage1,
        humanMessage2,
    ]);
});
