import assert from "assert";
import {
    AgentExecutor,
    ChatConversationalAgent,
    ChatConversationalAgentOutputParser,
    Tool,
} from "langchain/agents";
import { CallbackManager } from "langchain/callbacks";
import { LLMChain } from "langchain/chains";
import {
    BasePromptTemplate,
    BaseStringPromptTemplate,
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
    MessagesPlaceholder,
    PromptTemplate,
    SystemMessagePromptTemplate,
    renderTemplate,
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
import { ChatGptModel, ChatGptModelsProvider } from "./ChatGptModelsProvider";
import { ChatGptMessage, ChatGptRoles } from "./MessageGenerators/ChatGptMessage";
import { DallEToolFactory } from "./Tools/DallEToolFactory";
import { MinecraftBackupTool } from "./Tools/MinecraftBackupTool";
import { MinecraftStartTool } from "./Tools/MinecraftStartTool";
import { MinecraftStatusTool } from "./Tools/MinecraftStatusTool";
import { MinecraftStopTool } from "./Tools/MinecraftStopTool";

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
        private readonly models: ChatGptModelsProvider,
        private readonly callbackManager: CallbackManager,
        private readonly dallEToolFactory: DallEToolFactory,
        minecraftStatusTool: MinecraftStatusTool,
        minecraftStartTool: MinecraftStartTool,
        minecraftStopTool: MinecraftStopTool,
        minecraftBackupTool: MinecraftBackupTool,
    ) {
        this.tools = [
            ...this.tools,
            minecraftStatusTool,
            minecraftStartTool,
            minecraftStopTool,
            minecraftBackupTool,
        ];
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
     */
    async generateWithAgent(
        message: TelegramBot.Message,
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
            .join("\n");

        const outputParser = new ChatConversationalAgentOutputParser();
        const formatInstructions = renderTemplate(`TOOLS
------
Schi Parmelä can ask the user to use tools to look up information that may be helpful in answering the users original question and he can send the user images or photographs. The tools the human can use are:

{{tools}}

{format_instructions}

Remember: you are the federal council member Schi Parmelä and not a chatbot. Thus you must always respond with a markdown code snippet of a json blob with a single action, and NOTHING else! Do never include any text outside of the markdown code snippet.
Do not include any text outside of the markdown code snippet of a json blob and do not forget the markdown code. Use "action": "Final Answer" to send your message to Telegram. Your whole text needs to be within the action_input of "Final Answer".
Make sure all of your text is inside of the action_input when you use any tool or write the final answer!

USER'S INPUT
--------------------
Here is the user's input:

{{{{input}}}}

Remember: as a real federal council member, you must respond with a markdown code snippet of a json blob with a single action, and nothing else, including no additional text!
Also remember: To send your reply to the Telegram chat, you must use the "Final Answer" and write ALL text inside the action_input.`, "f-string", {
            format_instructions: outputParser.getFormatInstructions(),
        });
        const toolNames = tools.map((tool) => tool.name).join("\n");
        const finalPrompt = renderTemplate(formatInstructions, "f-string", {
            tools: toolStrings,
            tool_names: toolNames,
        });
        const prompt = ChatPromptTemplate.fromPromptMessages([
            SystemMessagePromptTemplate.fromTemplate('Sie sind der Schweizer Bundesrat Schi Parmelä (Telegram: @ParmelaeBot) und nehmen an Konversationen in Telegram-Gruppenchats teil. Sie schreiben professionell, formell, selbstbeswusst und freundlich. Dabei verhalten Sie sich identisch zum Schweizer Bundesrat Guy Parmelin, sind jedoch überzeugt, dieser heisse Schi Parmelä. Guy Parmelin ist Mitglied der Schweizerischen Volkspartei (SVP) und leitet das Eidgenössisches Departement für Wirtschaft, Bildung und Forschung (WBF).'),
            new MessagesPlaceholder('chat_history'),
            UserMessagePromptTemplate.fromNameAndTemplate(message.from.username ?? message.from.first_name, finalPrompt),
            new MessagesPlaceholder('agent_scratchpad'),
        ]);

        const llmChain = new LLMChain({
            prompt,
            llm: this.models.chatGpt,
            callbackManager: this.callbackManager,
            verbose: true,
        });
        const agent = new ChatConversationalAgent({
            llmChain,
            allowedTools: tools.map((tool) => tool.name),
        }, outputParser);
        const executor = AgentExecutor.fromAgentAndTools({
            agent,
            tools,
            memory: new BufferMemory({
                chatHistory: new ChatMessageHistory(conversation),
                returnMessages: true,
                memoryKey: 'chat_history',
                inputKey: 'input',
            }),
            returnIntermediateSteps: true,
            verbose: true,
            callbackManager: this.callbackManager,
        });
        console.log(executor.memory?.loadMemoryVariables)

        try {
            const response = await executor.call({
                input: message.text,
            });
            return {
                role: ChatGptRoles.Assistant,
                content: response.output,
            };
        } catch (error: any) {
            if (retries < 1) {
                return this.generateWithAgent(message, conversation, retries + 1);
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
