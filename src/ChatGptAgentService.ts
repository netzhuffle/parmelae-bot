import assert from "assert";
import {
    AgentExecutor,
    ChatConversationalAgent,
    Tool,
} from "langchain/agents";
import { CallbackManager } from "langchain/callbacks";
import { LLMChain } from "langchain/chains";
import { BasePromptTemplate } from "langchain/prompts";
import { BaseChatMessage } from "langchain/schema";
import { BufferMemory, ChatMessageHistory } from "langchain/memory";
import { Calculator } from "langchain/tools/calculator";
import TelegramBot from "node-telegram-bot-api";
import { injectable } from "inversify";
import { GptModelsProvider } from "./GptModelsProvider";
import { ChatGptMessage, ChatGptRoles } from "./MessageGenerators/ChatGptMessage";
import { DallEToolFactory } from "./Tools/DallEToolFactory";
import { MinecraftBackupTool } from "./Tools/MinecraftBackupTool";
import { MinecraftStartTool } from "./Tools/MinecraftStartTool";
import { MinecraftStatusTool } from "./Tools/MinecraftStatusTool";
import { MinecraftStopTool } from "./Tools/MinecraftStopTool";
import { SwissConstitutionQaToolFactory } from "./Tools/SwissConstitutionQaToolFactory";
import { WebBrowserToolFactory } from "./Tools/WebBrowserToolFactory";
import { GoogleSearchToolFactory } from "./Tools/GoogleSearchToolFactory";
import { GitHubToolFactory } from "./Tools/GitHubToolFactory";
import { GptModelQueryTool } from "./Tools/GptModelQueryTool";
import { GptModelSetterTool } from "./Tools/GptModelSetterTool";
import { Config } from "./Config";

/** ChatGPT Service */
@injectable()
export class ChatGptAgentService {
    private readonly tools: Tool[] = [
        new Calculator,
    ];

    constructor(
        private readonly models: GptModelsProvider,
        private readonly config: Config,
        private readonly callbackManager: CallbackManager,
        private readonly dallEToolFactory: DallEToolFactory,
        minecraftStatusTool: MinecraftStatusTool,
        minecraftStartTool: MinecraftStartTool,
        minecraftStopTool: MinecraftStopTool,
        minecraftBackupTool: MinecraftBackupTool,
        swissConstitutionQaToolFactory: SwissConstitutionQaToolFactory,
        webBrowserToolFactory: WebBrowserToolFactory,
        googleSearchToolFactory: GoogleSearchToolFactory,
        gitHubToolFactory: GitHubToolFactory,
        gptModelQueryTool: GptModelQueryTool,
        gptModelSetterTool: GptModelSetterTool,
    ) {
        this.tools = [
            ...this.tools,
            minecraftStatusTool,
            minecraftStartTool,
            minecraftStopTool,
            minecraftBackupTool,
            webBrowserToolFactory.create(),
            googleSearchToolFactory.create(),
            gptModelQueryTool,
            gptModelSetterTool,
        ];
        const tools = this.tools;
        swissConstitutionQaToolFactory.create().then(tool => tools.push(tool));
        gitHubToolFactory.create().then(tool => tools.push(tool));
    }

    /**
     * Generates and returns a message using an agent executor and tools.
     * 
     * @param prompt - Prompt Template with the following placeholders: {tools}, {tool_names}, MessagesPlaceholder('example'), MessagesPlaceholder('conversation'), MessagesPlaceholder('agent_scratchpad')
     */
    async generate(
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
            llm: this.config.useGpt4 ? this.models.gpt4 : this.models.chatGpt,
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
                tools: toolStrings,
                tool_names: toolNames,
                example,
            });
            return {
                role: ChatGptRoles.Assistant,
                content: response.output,
            };
        } catch (error: any) {
            if (retries < 1) {
                return this.generate(message, prompt, example, conversation, retries + 1);
            }
            return {
                role: ChatGptRoles.Assistant,
                content: `Fehler: ${error.message}`,
            };
        }
    }
}
