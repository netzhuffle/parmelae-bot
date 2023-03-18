import {
    ChatCompletionRequestMessage,
    ChatCompletionRequestMessageRoleEnum,
    ChatCompletionResponseMessage,
    ChatCompletionResponseMessageRoleEnum,
    OpenAIApi
} from "openai";
import {singleton} from "tsyringe";
import {ChatGptMessage, ChatGptRole} from "./MessageGenerators/ChatGptMessage";
import {NotExhaustiveSwitchError} from "./NotExhaustiveSwitchError";

/** The ChatGPT model to use. */
const MODEL = 'gpt-3.5-turbo';

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
        try {
            const response = await this.openAi.createChatCompletion({
                model: MODEL,
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
            content: message.content,
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
            case ChatGptRole.System:
                return ChatCompletionRequestMessageRoleEnum.System;
            case ChatGptRole.Assistant:
                return ChatCompletionRequestMessageRoleEnum.Assistant;
            case ChatGptRole.User:
                return ChatCompletionRequestMessageRoleEnum.User;
            default:
                throw new NotExhaustiveSwitchError(role);
        }
    }

    private getRole(role: ChatCompletionResponseMessageRoleEnum): ChatGptRole {
        switch (role) {
            case ChatCompletionRequestMessageRoleEnum.System:
                return ChatGptRole.System;
            case ChatCompletionRequestMessageRoleEnum.Assistant:
                return ChatGptRole.Assistant;
            case ChatCompletionRequestMessageRoleEnum.User:
                return ChatGptRole.User;
            default:
                throw new NotExhaustiveSwitchError(role);
        }
    }
}
