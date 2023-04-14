import assert from "assert";
import {
    AgentExecutor,
    ChatConversationalAgent,
    Tool,
} from "langchain/agents";
import { CallbackManager } from "langchain/callbacks";
import { LLMChain } from "langchain/chains";
import {
    BasePromptTemplate,
    BaseStringPromptTemplate,
    HumanMessagePromptTemplate,
    PromptTemplate,
} from "langchain/prompts";
import {
    BaseChatMessage,
    ChainValues,
    HumanChatMessage,
    InputValues,
} from "langchain/schema";
import { BufferMemory, ChatMessageHistory } from "langchain/memory";
import { Calculator } from "langchain/tools/calculator";
import TelegramBot from "node-telegram-bot-api";
import { singleton } from "tsyringe";
import { ChatGptModel, GptModelsProvider } from "./GptModelsProvider";
import { ChatGptMessage, ChatGptRoles } from "./MessageGenerators/ChatGptMessage";
import { DallEToolFactory } from "./Tools/DallEToolFactory";
import { MinecraftBackupTool } from "./Tools/MinecraftBackupTool";
import { MinecraftStartTool } from "./Tools/MinecraftStartTool";
import { MinecraftStatusTool } from "./Tools/MinecraftStatusTool";
import { MinecraftStopTool } from "./Tools/MinecraftStopTool";
import { SwissConstitutionQaToolFactory } from "./Tools/SwissConstitutionQaToolFactory";
import { WebBrowserToolFactory } from "./Tools/WebBrowserToolFactory";

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

    private readonly tools: Tool[] = [
        new Calculator,
    ];

    constructor(
        private readonly models: GptModelsProvider,
        private readonly callbackManager: CallbackManager,
        private readonly dallEToolFactory: DallEToolFactory,
        minecraftStatusTool: MinecraftStatusTool,
        minecraftStartTool: MinecraftStartTool,
        minecraftStopTool: MinecraftStopTool,
        minecraftBackupTool: MinecraftBackupTool,
        swissConstitutionQaTool: SwissConstitutionQaToolFactory,
        webBrowserToolProvider: WebBrowserToolFactory,
    ) {
        this.tools = [
            ...this.tools,
            minecraftStatusTool,
            minecraftStartTool,
            minecraftStopTool,
            minecraftBackupTool,
            webBrowserToolProvider.create(),
        ];
        const tools = this.tools;
        swissConstitutionQaTool.create().then(tool => tools.push(tool));
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

    /**
     * Generates and returns a message using an agent executor and tools.
     * 
     * @param prompt - Prompt Template with the following placeholders: {tools}, {tool_names}, MessagesPlaceholder('example'), MessagesPlaceholder('conversation'), MessagesPlaceholder('agent_scratchpad')
     */
    async generateWithAgent(
        message: TelegramBot.Message,
        prompt: BasePromptTemplate,
        example: BaseChatMessage[],
        conversation: BaseChatMessage[],
        retries: number = 0,
    ): Promise<ChatGptMessage> {
        assert(message.from);

        const tools = [
            ...this.tools,
            this.dallEToolFactory.create(message),
        ];
        ChatConversationalAgent.validateTools(this.tools);
        const toolStrings = tools
            .map((tool) => `${tool.name}: ${tool.description}`)
            .join('\n');
        const toolNames = tools.map((tool) => tool.name).join(', ');

        const llmChain = new LLMChain({
            prompt,
            llm: this.models.chatGpt,
            callbackManager: this.callbackManager,
            verbose: true,
        });
        const agent = new ChatConversationalAgent({
            llmChain,
            allowedTools: tools.map((tool) => tool.name),
        });
        const executor = AgentExecutor.fromAgentAndTools({
            agent,
            tools,
            memory: new BufferMemory({
                chatHistory: new ChatMessageHistory(conversation),
                returnMessages: true,
                memoryKey: 'conversation',
                inputKey: 'input',
            }),
            verbose: true,
            callbackManager: this.callbackManager,
        });
        console.log(executor.memory?.loadMemoryVariables)

        try {
            const response = await executor.call({
                tools,
                tool_names: toolNames,
                example,
            });
            return {
                role: ChatGptRoles.Assistant,
                content: response.output,
            };
        } catch (error: any) {
            if (retries < 1) {
                return this.generateWithAgent(message, prompt, example, conversation, retries + 1);
            }
            return {
                role: ChatGptRoles.Assistant,
                content: `Fehler: ${error.message}`,
            };
        }
    }

    /** Returns a human chat message with a username. */
    static createUserChatMessage(name: string, content: string): HumanChatMessage {
        const message = new HumanChatMessage(content);
        message.name = name;
        return message;
    }
}
