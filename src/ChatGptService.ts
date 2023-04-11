import assert from "assert";
import {CallbackManager} from "langchain/callbacks";
import {LLMChain} from "langchain/chains";
import {
    BasePromptTemplate,
    BaseStringPromptTemplate, ChatPromptTemplate, HumanMessagePromptTemplate, MessagesPlaceholder, PromptTemplate
} from "langchain/prompts";
import {
    AIChatMessage,
    BaseChatMessage,
    ChainValues,
    HumanChatMessage,
    InputValues,
    SystemChatMessage
} from "langchain/schema";
import {singleton} from "tsyringe";
import {ChatGptModel, ChatGptModels, ChatGptModelsProvider} from "./ChatGptModelsProvider";
import {ChatGptMessage, ChatGptRoles} from "./MessageGenerators/ChatGptMessage";
import {NotExhaustiveSwitchError} from "./NotExhaustiveSwitchError";

/** The string the newest message starts with to trigger use of GPT-4. */
const GPT4_STRING = '4:';

/** RegExp to match the GPT-4 string. */
const GPT4_REGEXP = new RegExp(`^${GPT4_STRING}`);

/** Human message template with username. */
export class UserMessagePromptTemplate extends HumanMessagePromptTemplate {
    async format(values: InputValues): Promise<BaseChatMessage> {
        if (!this.name) {
            return super.format(values);
        }

        const message = await super.format(values);
        assert(message instanceof HumanChatMessage);
        message.name = this.name;
        return message;
    }

    constructor(
        prompt: BaseStringPromptTemplate,
        private readonly name?: string,
    ) {
        super(prompt);
    }

    static fromNameAndTemplate(name: string, template: string) {
        return new this(PromptTemplate.fromTemplate(template), name);
    }
}

/** ChatGPT Service */
@singleton()
export class ChatGptService {
    /** Maximum number of characters in input text to avoid high cost. */
    static readonly MAX_INPUT_TEXT_LENGTH = 1200;

    constructor(
        private readonly models: ChatGptModelsProvider,
        private readonly callbackManager: CallbackManager,
    ) {
    }

    /**
     * Generates and returns a message using a prompt and model.
     */
    async generate(
        prompt: BasePromptTemplate,
        model: ChatGptModel,
        promptValues: ChainValues,
    ): Promise<ChatGptMessage> {
        const chain = new LLMChain({
            prompt,
            llm: this.models.getModel(model),
            callbackManager: this.callbackManager,
            verbose: true,
        });
        const response = await chain.call(promptValues);

        return {
            role: ChatGptRoles.Assistant,
            content: response.text,
        };
    }

    /** Returns a human chat message with a username. */
    static createUserChatMessage(name: string, content: string): HumanChatMessage {
        const message = new HumanChatMessage(content);
        message.name = name;
        return message;
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
                return message.name ? ChatGptService.createUserChatMessage(message.name, content) : new HumanChatMessage(content);
            default:
                throw new NotExhaustiveSwitchError(role);
        }
    }
}
