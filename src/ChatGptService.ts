import assert from "assert";
import {
    ChatCompletionRequestMessage,
    ChatCompletionRequestMessageRoleEnum,
    ChatCompletionResponseMessage,
    ChatCompletionResponseMessageRoleEnum,
    OpenAIApi
} from "openai";
import {singleton} from "tsyringe";
import {ChatGptMessage, ChatGptRole, ChatGptRoles} from "./MessageGenerators/ChatGptMessage";
import {NotExhaustiveSwitchError} from "./NotExhaustiveSwitchError";

/** The ChatGPT model to use. */
const CHAT_GPT = 'gpt-3.5-turbo';

/** The GPT-4 model to use. */
const GPT4 = 'gpt-4';

/** The string the newest message starts with to trigger use of GPT-4. */
const GPT4_STRING = '4:';

/** RegExp to match the GPT-4 string. */
const GPT4_REGEXP = new RegExp(`^${GPT4_STRING}`);

/** ChatGPT Service */
@singleton()
export class ChatGptService {
    /** Maximum number of characters in input text to avoid high cost. */
    static readonly MAX_INPUT_TEXT_LENGTH = 1200;

    constructor(
        private readonly openAi: OpenAIApi,
    ) {
    }

    /**
     * Generates a completion message if possible and returns it.
     */
    async generateCompletion(
        messages: ChatGptMessage[],
    ): Promise<ChatGptMessage | null> {
        assert(messages.length > 0);
        try {
            const response = await this.openAi.createChatCompletion({
                model: messages[messages.length - 1].content.startsWith('4:') ? GPT4 : CHAT_GPT,
                messages: messages.map(this.getRequestMessage.bind(this)),
            });
            const responseMessage = response.data.choices?.[0].message;

            return responseMessage ? this.getMessage(responseMessage) : null;
        } catch (e) {
            if (e instanceof Error && e.message.startsWith('connect ECONNREFUSED')) {
                return null;
            }
            throw e;
        }
    }

    private getRequestMessage(message: ChatGptMessage): ChatCompletionRequestMessage {
        return {
            role: this.getRequestRole(message.role),
            content: message.content.replace(GPT4_REGEXP, '').trim(),
            name: message.name,
        };
    }

    private getMessage(apiMessage: ChatCompletionResponseMessage): ChatGptMessage {
        return {
            role: this.getRole(apiMessage.role),
            content: apiMessage.content,
        };
    }

    private getRequestRole(role: ChatGptRole): ChatCompletionRequestMessageRoleEnum {
        switch (role) {
            case ChatGptRoles.System:
                return ChatCompletionRequestMessageRoleEnum.System;
            case ChatGptRoles.Assistant:
                return ChatCompletionRequestMessageRoleEnum.Assistant;
            case ChatGptRoles.User:
                return ChatCompletionRequestMessageRoleEnum.User;
            default:
                throw new NotExhaustiveSwitchError(role);
        }
    }

    private getRole(role: ChatCompletionResponseMessageRoleEnum): ChatGptRole {
        switch (role) {
            case ChatCompletionRequestMessageRoleEnum.System:
                return ChatGptRoles.System;
            case ChatCompletionRequestMessageRoleEnum.Assistant:
                return ChatGptRoles.Assistant;
            case ChatCompletionRequestMessageRoleEnum.User:
                return ChatGptRoles.User;
            default:
                throw new NotExhaustiveSwitchError(role);
        }
    }
}
