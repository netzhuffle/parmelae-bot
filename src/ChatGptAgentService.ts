import assert from 'node:assert/strict';
import { injectable } from 'inversify';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { AIMessage, BaseMessage } from '@langchain/core/messages';
import { Calculator } from '@langchain/community/tools/calculator';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
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
import { StructuredTool } from '@langchain/core/tools';
import { Message } from '@prisma/client';
import { IntermediateAnswerToolFactory } from './Tools/IntermediateAnswerToolFactory.js';
import { CallbackHandlerFactory } from './CallbackHandlerFactory.js';
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
import { pokemonCardStatsTool } from './Tools/pokemonCardStatsTool.js';
import { LangGraphRunnableConfig } from '@langchain/langgraph';
import { DallEPromptGenerator } from './MessageGenerators/DallEPromptGenerator.js';
import { TelegramService } from './TelegramService.js';
import { DallEService } from './DallEService.js';
import { PokemonTcgPocketService } from './PokemonTcgPocket/PokemonTcgPocketService.js';

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
  private readonly tools: StructuredTool[] = [
    new Calculator(),
    diceTool,
    dallETool,
    dateTimeTool,
    pokemonCardSearchTool,
    pokemonCardAddTool,
    pokemonCardStatsTool,
  ];

  constructor(
    private readonly models: GptModelsProvider,
    private readonly config: Config,
    private readonly telegramService: TelegramService,
    private readonly dallEService: DallEService,
    private readonly dallEPromptGenerator: DallEPromptGenerator,
    private readonly callbackHandlerFactory: CallbackHandlerFactory,
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
   */
  async generate(
    message: Message,
    prompt: ChatPromptTemplate,
    example: BaseMessage[],
    conversation: Conversation,
    retries = 0,
  ): Promise<ChatGptMessage> {
    try {
      return this.getReply(message, prompt, example, conversation);
    } catch (error) {
      if (retries < 2) {
        return this.generate(
          message,
          prompt,
          example,
          conversation,
          retries + 1,
        );
      }
      ErrorService.log(error);
      assert(error instanceof Error);
      return {
        role: ChatGptRoles.Assistant,
        content: `Fehler: ${error.message}`,
      };
    }
  }

  private async getReply(
    message: Message,
    prompt: ChatPromptTemplate,
    example: BaseMessage[],
    conversation: Conversation,
  ): Promise<ChatGptMessage> {
    const agent = createReactAgent({
      llm: this.models.getModel(this.config.gptModel),
      tools: [
        ...this.tools,
        this.identityQueryToolFactory.create(message.chatId),
        this.identitySetterToolFactory.create(message.chatId),
        this.scheduleMessageToolFactory.create(message.chatId, message.fromId),
        this.intermediateAnswerToolFactory.create(message.chatId),
      ],
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
        callbacks: [this.callbackHandlerFactory.create(message.chatId)],
      },
    );
    const lastMessage = agentOutput.messages[agentOutput.messages.length - 1];
    assert(lastMessage instanceof AIMessage);
    assert(typeof lastMessage.content === 'string');
    return {
      role: ChatGptRoles.Assistant,
      content: lastMessage.content,
    };
  }
}
