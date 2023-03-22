import {
    ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum,
    ChatCompletionResponseMessageRoleEnum, OpenAIApi
} from "openai/dist/api";
import {ChatGptService} from "./ChatGptService";
import {ChatGptMessage, ChatGptRoles} from "./MessageGenerators/ChatGptMessage";

const requestResponse = {
    request: {} as object,
    response: {} as object,
    error: null as Error | null,
};
const openAiFake = {
    request: {},
    response: {},
    createChatCompletion: async (request: object) => {
        requestResponse.request = request;

        if (requestResponse.error) {
            throw requestResponse.error;
        }

        return requestResponse.response;
    },
} as unknown as OpenAIApi;

beforeEach(() => {
    requestResponse.request = {};
    requestResponse.response = {};
    requestResponse.error = null;
});

test('generate ChatGPT completion', async () => {
    requestResponse.response = {
        data: {
            choices: [
                {
                    message: {
                        role: ChatCompletionResponseMessageRoleEnum.Assistant,
                        content: 'completion',
                    },
                },
            ],
        },
    };
    const sut = new ChatGptService(openAiFake);
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

    const response = await sut.generateCompletion(requestMessages);

    expect(response).toEqual({
        role: ChatGptRoles.Assistant,
        content: 'completion',
    });
    expect(requestResponse.request).toEqual({
        model: 'gpt-3.5-turbo',
        messages: [
            {
                role: ChatCompletionRequestMessageRoleEnum.System,
                content: 'System Message',
            },
            {
                role: ChatCompletionRequestMessageRoleEnum.Assistant,
                content: 'Assistant Message',
            },
            {
                role: ChatCompletionRequestMessageRoleEnum.User,
                content: 'User Message',
                name: 'Username',
            },
        ] as ChatCompletionRequestMessage[],
    });
});

test('generate GPT-4 completion', async () => {
    requestResponse.response = {
        data: {
            choices: [
                {
                    message: {
                        role: ChatCompletionResponseMessageRoleEnum.Assistant,
                        content: 'completion',
                    },
                },
            ],
        },
    };
    const sut = new ChatGptService(openAiFake);
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

    const response = await sut.generateCompletion(requestMessages);

    expect(response).toEqual({
        role: ChatGptRoles.Assistant,
        content: 'completion',
    });
    expect(requestResponse.request).toEqual({
        model: 'gpt-4',
        messages: [
            {
                role: ChatCompletionRequestMessageRoleEnum.System,
                content: 'System Message',
            },
            {
                role: ChatCompletionRequestMessageRoleEnum.User,
                content: 'User Message 1',
                name: 'Username 1',
            },
            {
                role: ChatCompletionRequestMessageRoleEnum.User,
                content: 'User Message 2',
                name: 'Username 2',
            },
        ] as ChatCompletionRequestMessage[],
    });
});

test('ChatGPT connect error', async () => {
    requestResponse.error = new Error('connect ECONNREFUSED error');
    const sut = new ChatGptService(openAiFake);
    const requestMessages: ChatGptMessage[] = [
        {
            role: ChatGptRoles.User,
            content: 'User Message',
            name: 'Username',
        },
    ];

    const response = await sut.generateCompletion(requestMessages);

    expect(response).toBeNull();
});

test('ChatGPT other error', () => {
    requestResponse.error = new Error('some other error');
    const sut = new ChatGptService(openAiFake);
    const requestMessages: ChatGptMessage[] = [
        {
            role: ChatGptRoles.User,
            content: 'User Message',
            name: 'Username',
        },
    ];

    const response = sut.generateCompletion(requestMessages);

    expect.assertions(1);
    response.catch(e => expect(e.message).toBe('some other error'));
});
