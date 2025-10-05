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
import { WebBrowserToolFactory } from './Tools/WebBrowserToolFactory.js';
import { GoogleSearchToolFactory } from './Tools/GoogleSearchToolFactory.js';
import { GitHubToolFactory } from './Tools/GitHubToolFactory.js';
import { GptModelQueryTool } from './Tools/GptModelQueryTool.js';
import { GptModelSetterTool } from './Tools/GptModelSetterTool.js';
import { Config } from './Config.js';
import { SchiParmelaeIdentity } from './MessageGenerators/Identities/SchiParmelaeIdentity.js';
import { EmulatorIdentity } from './MessageGenerators/Identities/EmulatorIdentity.js';
import { Identity } from './MessageGenerators/Identities/Identity.js';
import { SCHEDULE_MESSAGE_TOOL_NAME } from './Tools/ScheduleMessageTool.js';
import { INTERMEDIATE_ANSWER_TOOL_NAME } from './Tools/IntermediateAnswerTool.js';
import { StructuredTool, Tool } from '@langchain/core/tools';
import { MessageModel } from './generated/prisma/models/Message.js';
import { IntermediateAnswerToolFactory } from './Tools/IntermediateAnswerToolFactory.js';
import { CallbackHandler } from './CallbackHandler.js';
import { ScheduleMessageToolFactory } from './Tools/ScheduleMessageToolFactory.js';
import { ErrorService } from './ErrorService.js';
import { Conversation } from './Conversation.js';
import { identityQueryTool } from './Tools/identityQueryTool.js';
import { identitySetterTool } from './Tools/identitySetterTool.js';
import { diceTool } from './Tools/diceTool.js';
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
  identityByChatId: Map<bigint, Identity>;
  identities: {
    schiParmelae: SchiParmelaeIdentity;
    emulator: EmulatorIdentity;
  };
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
  assert('identityByChatId' in value);
  assert('identities' in value);
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
      identityByChatId: undefined as unknown as Map<bigint, Identity>,
      identities: undefined as unknown as {
        schiParmelae: SchiParmelaeIdentity;
        emulator: EmulatorIdentity;
      },
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
    dateTimeTool,
    identityQueryTool,
    identitySetterTool,
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
    private readonly schiParmelaeIdentity: SchiParmelaeIdentity,
    private readonly emulatorIdentity: EmulatorIdentity,
    private readonly intermediateAnswerToolFactory: IntermediateAnswerToolFactory,
    private readonly scheduleMessageToolFactory: ScheduleMessageToolFactory,
    gitHubToolFactory: GitHubToolFactory,
    googleSearchToolFactory: GoogleSearchToolFactory,
    gptModelQueryTool: GptModelQueryTool,
    gptModelSetterTool: GptModelSetterTool,
    webBrowserToolFactory: WebBrowserToolFactory,
  ) {
    this.tools = [
      ...this.tools,
      googleSearchToolFactory.create(),
      gptModelQueryTool,
      gptModelSetterTool,
      webBrowserToolFactory.create(),
    ];

    // Note: GitHub tool is loaded asynchronously and added to tools array after creation
    // This allows the tool to be available for subsequent requests without blocking startup
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
   * **Tool Merge Precedence:** global tools → identity.tools → schedule → intermediate
   * **Prompt Source:** Uses identity.prompt internally (must include 'example' and 'conversation' placeholders)
   * **Identity.tools Contract:** Must be safe to reuse across calls (no mutable internal state)
   * **Critical Tool Protection:** Identity tools with reserved names ('schedule-message', 'intermediate-answer') are filtered out with warnings
   *
   * @param message - The message to respond to
   * @param example - Example conversation messages for the prompt
   * @param conversation - Recent conversation history for context
   * @param announceToolCall - Callback to announce tool calls (e.g., send to Telegram)
   * @param identity - Bot identity containing prompt template and tools
   * @param retries - Current retry attempt (internal use)
   */
  async generate(
    message: MessageModel,
    example: BaseMessage[],
    conversation: Conversation,
    announceToolCall: (text: string) => Promise<number | null>,
    identity: Identity,
    retries = 0,
  ): Promise<ChatGptAgentResponse> {
    try {
      return this.getReply(
        message,
        identity.prompt,
        example,
        conversation,
        announceToolCall,
        identity,
      );
    } catch (error) {
      if (retries < 2) {
        return this.generate(
          message,
          example,
          conversation,
          announceToolCall,
          identity,
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

  /**
   * Builds the complete tools array by merging global tools with identity-specific tools.
   *
   * **Tool Merge Order:** global tools → identity.tools → schedule → intermediate
   * **Critical Tool Protection:** Identity tools with reserved names ('schedule-message', 'intermediate-answer')
   * are filtered out with warnings to prevent system instability
   *
   * @param identity - The bot identity containing prompt and tools
   * @param message - The message being processed (needed for dynamic tool creation)
   * @returns Complete tools array ready for agent creation
   */
  private buildTools(
    identity: Identity,
    message: MessageModel,
  ): (StructuredTool | Tool)[] {
    // Guard against identity tools shadowing critical system tools
    const criticalToolNames = new Set([
      SCHEDULE_MESSAGE_TOOL_NAME,
      INTERMEDIATE_ANSWER_TOOL_NAME,
    ]);
    const conflictingTools = identity.tools.filter((tool) =>
      criticalToolNames.has(tool.name),
    );
    if (conflictingTools.length > 0) {
      console.warn(
        `Identity "${identity.name}" defines tools that conflict with critical system tools: ${conflictingTools.map((t) => t.name).join(', ')}. ` +
          'These will be ignored to prevent system instability.',
      );
    }

    // Merge global tools with identity-specific tools (excluding conflicts)
    const identityTools = identity.tools.filter(
      (tool) => !criticalToolNames.has(tool.name),
    );
    return [
      ...this.tools,
      ...identityTools,
      this.scheduleMessageToolFactory.create(message.chatId, message.fromId),
      this.intermediateAnswerToolFactory.create(message.chatId),
    ];
  }

  private async getReply(
    message: MessageModel,
    prompt: ChatPromptTemplate,
    example: BaseMessage[],
    conversation: Conversation,
    announceToolCall: (text: string) => Promise<number | null>,
    identity: Identity,
  ): Promise<ChatGptAgentResponse> {
    const allTools = this.buildTools(identity, message);

    const agent = this.agentStateGraphFactory.create({
      tools: allTools,
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
          identityByChatId: this.config.identityByChatId,
          identities: {
            schiParmelae: this.schiParmelaeIdentity,
            emulator: this.emulatorIdentity,
          },
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
