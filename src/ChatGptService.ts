import assert from "assert";
import { CallbackManager } from "langchain/callbacks";
import { LLMChain } from "langchain/chains";
import { ChatPromptTemplate, MessagesPlaceholder } from "langchain/prompts";
import {
    AIChatMessage,
    BaseChatMessage,
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
        private readonly callbackManager: CallbackManager,
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
        const prompt = ChatPromptTemplate.fromPromptMessages([
            new MessagesPlaceholder('messages'),
        ]);
        const chain = new LLMChain({
            prompt,
            llm: model,
            callbackManager: this.callbackManager,
        });
        const response = await chain.call({
            messages: langChainMessages,
        });

        return {
            role: ChatGptRoles.Assistant,
            content: response.text,
        };
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
}
