import assert from "assert";
import {
    AIChatMessage,
    BaseChatMessage,
    ChatMessage,
    HumanChatMessage,
    SystemChatMessage
} from "langchain/schema";
import {singleton} from "tsyringe";
import {ChatGptModels} from "./ChatGptModels";
import {ChatGptMessage, ChatGptRole, ChatGptRoles} from "./MessageGenerators/ChatGptMessage";
import {NotExhaustiveSwitchError} from "./NotExhaustiveSwitchError";
import {UnknownLangChainMessageRoleError} from "./UnknownLangChainMessageRoleError";

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
        private readonly models: ChatGptModels,
    ) {
    }

    /**
     * Generates a completion message if possible and returns it.
     */
    async generateMessage(
        messages: ChatGptMessage[],
    ): Promise<ChatGptMessage> {
        assert(messages.length > 0);

        const model = messages[messages.length - 1].content.startsWith(GPT4_STRING) ? this.models.gpt4 : this.models.chatGpt;
        const langChainMessages = messages.map(this.getLangChainMessage.bind(this));
        const response = await model.call(langChainMessages);

        return this.getMessage(response);
    }

    private getLangChainMessage(message: ChatGptMessage): BaseChatMessage {
        const content = message.content.replace(GPT4_REGEXP, '').trim();
        const role = message.role;
        switch (role) {
            case ChatGptRoles.System:
                return new SystemChatMessage(content);
            case ChatGptRoles.Assistant:
                return new AIChatMessage(content);
            case ChatGptRoles.User:
                const humanMessage = new HumanChatMessage(content);
                humanMessage.name = message.name;
                return humanMessage;
            default:
                throw new NotExhaustiveSwitchError(role);
        }
    }

    private getMessage(langChainMessage: BaseChatMessage): ChatGptMessage {
        const role = this.getRole(langChainMessage);
        switch (role) {
            case ChatGptRoles.System:
            case ChatGptRoles.Assistant:
                return {
                    role: role,
                    content: langChainMessage.text,
                };
            case ChatGptRoles.User:
                return {
                    role: role,
                    content: langChainMessage.text,
                    name: langChainMessage.name,
                };
            default:
                throw new NotExhaustiveSwitchError(role);
        }

    }

    private getRole(langChainMessage: BaseChatMessage): ChatGptRole {
        const type = langChainMessage._getType();
        switch (type) {
            case 'system':
                return ChatGptRoles.System;
            case 'ai':
                return ChatGptRoles.Assistant;
            case 'human':
                return ChatGptRoles.User;
            case 'generic':
                assert(langChainMessage instanceof ChatMessage);
                switch (langChainMessage.role) {
                    case 'system':
                        return ChatGptRoles.System;
                    case 'ai':
                        return ChatGptRoles.Assistant;
                    case 'human':
                        return ChatGptRoles.User;
                    default:
                        throw new UnknownLangChainMessageRoleError(langChainMessage.role);
                }
            default:
                throw new NotExhaustiveSwitchError(type);
        }
    }
}
