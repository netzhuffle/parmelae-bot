import assert from 'node:assert/strict';
import { injectable } from 'inversify';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { AIMessage, BaseMessage } from '@langchain/core/messages';
import { Calculator } from '@langchain/community/tools/calculator';
import { GptModelsProvider } from './GptModelsProvider.js';
import {
  ChatGptMessage,
  ChatGptRoles,
} from './MessageGenerators/ChatGptMessage.js';
import { MinecraftStartTool } from './Tools/MinecraftStartTool.js';
import { MinecraftStatusTool } from './Tools/MinecraftStatusTool.js';
import { MinecraftStopTool } from './Tools/MinecraftStopTool.js';
import { WebBrowserToolFactory } from './Tools/WebBrowserToolFactory.js';
import { GoogleSearchToolFactory } from './Tools/GoogleSearchToolFactory.js';
import { GitHubToolFactory } from './Tools/GitHubToolFactory.js';
import { GptModelQueryTool } from './Tools/GptModelQueryTool.js';
import { GptModelSetterTool } from './Tools/GptModelSetterTool.js';
import { Config } from './Config.js';
import { StructuredTool, Tool } from '@langchain/core/tools';
import { MessageModel } from './generated/prisma/models/Message.js';
import { IntermediateAnswerToolFactory } from './Tools/IntermediateAnswerToolFactory.js';
import { CallbackHandler } from './CallbackHandler.js';
import { ScheduleMessageToolFactory } from './Tools/ScheduleMessageToolFactory.js';
import { ErrorService } from './ErrorService.js';
import { Conversation } from './Conversation.js';
import { IdentityQueryToolFactory } from './Tools/IdentityQueryToolFactory.js';
import { IdentitySetterToolFactory } from './Tools/IdentitySetterToolFactory.js';
import { diceTool } from './Tools/diceTool.js';
import { dallETool } from './Tools/dallETool.js';
import { dateTimeTool } from './Tools/dateTimeTool.js';
import { pokemonCardSearchTool } from './Tools/pokemonCardSearchTool.js';
import { pokemonCardAddTool } from './Tools/pokemonCardAddTool.js';
import { pokemonCardRangeAddTool } from './Tools/pokemonCardRangeAddTool.js';
import { pokemonCardStatsTool } from './Tools/pokemonCardStatsTool.js';
import { LangGraphRunnableConfig } from '@langchain/langgraph';
import { DallEPromptGenerator } from './MessageGenerators/DallEPromptGenerator.js';
import { TelegramService } from './TelegramService.js';
import { DallEService } from './DallEService.js';
import { PokemonTcgPocketService } from './PokemonTcgPocket/PokemonTcgPocketService.js';
import { AgentStateGraphFactory } from './AgentStateGraph/AgentStateGraphFactory.js';

/** Enhanced response from ChatGPT agent including tool call message IDs */
export interface ChatGptAgentResponse {
  message: ChatGptMessage;
  toolCallMessageIds: number[];
}

/** The context for the tools. */
export interface ToolContext {
  chatId: bigint;
  userId: bigint;
  telegramService: TelegramService;
  dallEService: DallEService;
  dallEPromptGenerator: DallEPromptGenerator;
  pokemonTcgPocketService: PokemonTcgPocketService;
}

function assertIsToolContext(value: unknown): asserts value is ToolContext {
  assert(typeof value === 'object');
  assert(value !== null);
  assert('chatId' in value);
  assert('userId' in value);
  assert('telegramService' in value);
  assert('dallEService' in value);
  assert('dallEPromptGenerator' in value);
  assert('pokemonTcgPocketService' in value);
}

/**
 * Gets the tool context from the config.
 * @param config - The LangGraph Runnable config to get the tool context from.
 * @returns The tool context.
 */
export function getToolContext(config: LangGraphRunnableConfig): ToolContext {
  assertIsToolContext(config.configurable);
  return config.configurable;
}

/**
 * TESTS ONLY – Creates a test tool config, defaults all context to undefined.
 * @param context - The context to create the tool context from.
 * @returns The tool context.
 */
export function createTestToolConfig(context: Partial<ToolContext>): {
  configurable: ToolContext;
} {
  return {
    configurable: {
      chatId: undefined as unknown as bigint,
      userId: undefined as unknown as bigint,
      telegramService: undefined as unknown as TelegramService,
      dallEService: undefined as unknown as DallEService,
      dallEPromptGenerator: undefined as unknown as DallEPromptGenerator,
      pokemonTcgPocketService: undefined as unknown as PokemonTcgPocketService,
      ...context,
    },
  };
}

/** ChatGPT Agent Service */
@injectable()
export class ChatGptAgentService {
  private readonly tools: (StructuredTool | Tool)[] = [
    new Calculator(),
    diceTool,
    dallETool,
    dateTimeTool,
    pokemonCardSearchTool,
    pokemonCardAddTool,
    pokemonCardRangeAddTool,
    pokemonCardStatsTool,
  ];

  constructor(
    private readonly agentStateGraphFactory: AgentStateGraphFactory,
    private readonly models: GptModelsProvider,
    private readonly config: Config,
    private readonly telegramService: TelegramService,
    private readonly dallEService: DallEService,
    private readonly dallEPromptGenerator: DallEPromptGenerator,
    private readonly callbackHandler: CallbackHandler,
    private readonly pokemonTcgPocketService: PokemonTcgPocketService,
    private readonly intermediateAnswerToolFactory: IntermediateAnswerToolFactory,
    private readonly scheduleMessageToolFactory: ScheduleMessageToolFactory,
    private readonly identityQueryToolFactory: IdentityQueryToolFactory,
    private readonly identitySetterToolFactory: IdentitySetterToolFactory,
    gitHubToolFactory: GitHubToolFactory,
    googleSearchToolFactory: GoogleSearchToolFactory,
    gptModelQueryTool: GptModelQueryTool,
    gptModelSetterTool: GptModelSetterTool,
    minecraftStatusTool: MinecraftStatusTool,
    minecraftStartTool: MinecraftStartTool,
    minecraftStopTool: MinecraftStopTool,
    webBrowserToolFactory: WebBrowserToolFactory,
  ) {
    this.tools = [
      ...this.tools,
      googleSearchToolFactory.create(),
      gptModelQueryTool,
      gptModelSetterTool,
      minecraftStatusTool,
      minecraftStartTool,
      minecraftStopTool,
      webBrowserToolFactory.create(),
    ];
    const tools = this.tools;
    gitHubToolFactory
      .create()
      .then((tool) => tools.push(tool))
      .catch((e) =>
        console.error('Could not create github-qa tool, continuing without', e),
      );
  }

  /**
   * Generates and returns a message using an agent executor and tools.
   *
   * @param basePrompt - Prompt Template with the following MessagesPlaceholders: example, conversation
   * @param announceToolCall - Callback to announce tool calls (e.g., send to Telegram)
   */
  async generate(
    message: MessageModel,
    prompt: ChatPromptTemplate,
    example: BaseMessage[],
    conversation: Conversation,
    announceToolCall: (text: string) => Promise<number | null>,
    retries = 0,
  ): Promise<ChatGptAgentResponse> {
    try {
      return this.getReply(
        message,
        prompt,
        example,
        conversation,
        announceToolCall,
      );
    } catch (error) {
      if (retries < 2) {
        return this.generate(
          message,
          prompt,
          example,
          conversation,
          announceToolCall,
          retries + 1,
        );
      }
      ErrorService.log(error);
      assert(error instanceof Error);
      return {
        message: {
          role: ChatGptRoles.Assistant,
          content: `Fehler: ${error.message}`,
        },
        toolCallMessageIds: [],
      };
    }
  }

  private async getReply(
    message: MessageModel,
    prompt: ChatPromptTemplate,
    example: BaseMessage[],
    conversation: Conversation,
    announceToolCall: (text: string) => Promise<number | null>,
  ): Promise<ChatGptAgentResponse> {
    const agent = this.agentStateGraphFactory.create({
      tools: [
        ...this.tools,
        this.identityQueryToolFactory.create(message.chatId),
        this.identitySetterToolFactory.create(message.chatId),
        this.scheduleMessageToolFactory.create(message.chatId, message.fromId),
        this.intermediateAnswerToolFactory.create(message.chatId),
      ],
      llm: this.models.getModel(this.config.gptModel),
      announceToolCall,
    });

    const agentOutput = await agent.invoke(
      {
        messages: await prompt.formatMessages({
          example,
          conversation: conversation.messages,
          message,
        }),
      },
      {
        configurable: {
          chatId: message.chatId,
          userId: message.fromId,
          telegramService: this.telegramService,
          dallEService: this.dallEService,
          dallEPromptGenerator: this.dallEPromptGenerator,
          pokemonTcgPocketService: this.pokemonTcgPocketService,
        } satisfies ToolContext,
        callbacks: [this.callbackHandler],
      },
    );
    const lastMessage = agentOutput.messages[agentOutput.messages.length - 1];
    assert(lastMessage instanceof AIMessage);
    assert(typeof lastMessage.content === 'string');

    // Extract tool call message IDs from the final state
    const toolCallMessageIds = agentOutput.toolCallMessageIds;

    return {
      message: {
        role: ChatGptRoles.Assistant,
        content: lastMessage.content,
      },
      toolCallMessageIds,
    };
  }
}
