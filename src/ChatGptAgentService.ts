import assert from 'node:assert/strict';

import { AIMessage, SystemMessage } from '@langchain/core/messages';
import { LangGraphRunnableConfig } from '@langchain/langgraph';
import { injectable } from 'inversify';

import { AgentStateGraphFactory } from './AgentStateGraph/AgentStateGraphFactory.js';
import { AgentTool, getAgentToolName } from './AgentTool.js';
import {
  getAiMessageTextChunkContent,
  getLastAiMessageTextContent,
} from './AiMessageTextContent.js';
import { CallbackHandler } from './CallbackHandler.js';
import { Config } from './Config.js';
import { Conversation } from './Conversation.js';
import { ErrorService } from './ErrorService.js';
import { MessageModel } from './generated/prisma/models/Message.js';
import { GptModelsProvider } from './GptModelsProvider.js';
import { withHostedImageGenerationStartHandler } from './HostedImageGenerationObserver.js';
import { getImageGenerationOutputs } from './ImageGenerationOutput.js';
import { ChatGptMessage, ChatGptRoles } from './MessageGenerators/ChatGptMessage.js';
import { EmulatorIdentity } from './MessageGenerators/Identities/EmulatorIdentity.js';
import { Identity } from './MessageGenerators/Identities/Identity.js';
import { IdentityResolverService } from './MessageGenerators/Identities/IdentityResolverService.js';
import { SchiParmelaeIdentity } from './MessageGenerators/Identities/SchiParmelaeIdentity.js';
import { PokemonTcgPocketService } from './PokemonTcgPocket/PokemonTcgPocketService.js';
import { isFinalizableStreamingTextSink, StreamingTextSink } from './StreamingTextSink.js';
import { TelegramService } from './TelegramService.js';
import { dateTimeTool } from './Tools/dateTimeTool.js';
import { diceTool } from './Tools/diceTool.js';
import { GoogleSearchToolFactory } from './Tools/GoogleSearchToolFactory.js';
import { GptModelQueryTool } from './Tools/GptModelQueryTool.js';
import { GptModelSetterTool } from './Tools/GptModelSetterTool.js';
import { identityQueryTool } from './Tools/identityQueryTool.js';
import { identitySetterTool } from './Tools/identitySetterTool.js';
import { IMAGE_GENERATION_TOOL_NAME } from './Tools/imageGenerationTool.js';
import { INTERMEDIATE_ANSWER_TOOL_NAME } from './Tools/IntermediateAnswerTool.js';
import { IntermediateAnswerToolFactory } from './Tools/IntermediateAnswerToolFactory.js';
import { pokemonCardAddTool } from './Tools/pokemonCardAddTool.js';
import { pokemonCardRangeAddTool } from './Tools/pokemonCardRangeAddTool.js';
import { pokemonCardSearchTool } from './Tools/pokemonCardSearchTool.js';
import { pokemonCardStatsTool } from './Tools/pokemonCardStatsTool.js';
import { SCHEDULE_MESSAGE_TOOL_NAME } from './Tools/ScheduleMessageTool.js';
import { ScheduleMessageToolFactory } from './Tools/ScheduleMessageToolFactory.js';
import { WebBrowserToolFactory } from './Tools/WebBrowserToolFactory.js';

/** Enhanced response from ChatGPT agent including tool call message IDs */
export interface ChatGptAgentResponse {
  message: ChatGptMessage;
  toolCallMessageIds: number[];
  finalMessageId?: number;
  finalMessageIds?: number[];
}

class HostedImageGenerationTextBuffer {
  private leadInText = '';
  private followUpText = '';

  imageGenerationStarted = false;

  append(text: string): void {
    if (this.imageGenerationStarted) {
      this.followUpText += text;
    } else {
      this.leadInText += text;
    }
  }

  markImageGenerationStarted(): void {
    this.imageGenerationStarted = true;
  }

  getLeadInText(): string {
    return this.leadInText;
  }

  getFollowUpText(): string {
    return this.followUpText.trim();
  }

  getCombinedText(primaryText: string): string {
    return [primaryText, this.getFollowUpText()].filter((text) => text.length > 0).join('\n\n');
  }
}

/** The context for the tools. */
export interface ToolContext {
  chatId: bigint;
  userId: bigint;
  telegramService: TelegramService;
  pokemonTcgPocketService: PokemonTcgPocketService;
  identityByChatId: Map<bigint, Identity>;
  identities: {
    schiParmelae: SchiParmelaeIdentity;
    emulator: EmulatorIdentity;
  };
  identityResolver: IdentityResolverService;
}

function assertIsToolContext(value: unknown): asserts value is ToolContext {
  assert(typeof value === 'object');
  assert(value !== null);
  assert('chatId' in value);
  assert('userId' in value);
  assert('telegramService' in value);
  assert('pokemonTcgPocketService' in value);
  assert('identityByChatId' in value);
  assert('identities' in value);
  assert('identityResolver' in value);
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
      pokemonTcgPocketService: undefined as unknown as PokemonTcgPocketService,
      identityByChatId: undefined as unknown as Map<bigint, Identity>,
      identities: undefined as unknown as {
        schiParmelae: SchiParmelaeIdentity;
        emulator: EmulatorIdentity;
      },
      identityResolver: undefined as unknown as IdentityResolverService,
      ...context,
    },
  };
}

/** ChatGPT Agent Service */
@injectable()
export class ChatGptAgentService {
  private readonly tools: AgentTool[] = [
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
    private readonly callbackHandler: CallbackHandler,
    private readonly pokemonTcgPocketService: PokemonTcgPocketService,
    private readonly schiParmelaeIdentity: SchiParmelaeIdentity,
    private readonly emulatorIdentity: EmulatorIdentity,
    private readonly identityResolver: IdentityResolverService,
    private readonly intermediateAnswerToolFactory: IntermediateAnswerToolFactory,
    private readonly scheduleMessageToolFactory: ScheduleMessageToolFactory,
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
  }

  /**
   * Generates and returns a message using an agent executor and tools.
   *
   * **Tool Merge Precedence:** global tools → identity.tools → schedule → intermediate
   * **Prompt Source:** Uses identity.prompt internally (must include 'conversation' placeholder)
   * **Identity.tools Contract:** Must be safe to reuse across calls (no mutable internal state)
   * **Critical Tool Protection:** Identity tools with reserved names ('schedule-message', 'intermediate-answer') are filtered out with warnings
   *
   * @param message - The message to respond to
   * @param conversation - Recent conversation history for context
   * @param announceToolCall - Callback to announce tool calls (e.g., send to Telegram)
   * @param identity - Bot identity containing prompt template and tools
   * @param retries - Current retry attempt (internal use)
   */
  async generate(
    message: MessageModel,
    conversation: Conversation,
    announceToolCall: (text: string) => Promise<number | null>,
    identity: Identity,
    streamSink?: StreamingTextSink,
    retries = 0,
  ): Promise<ChatGptAgentResponse> {
    try {
      return await this.getReply(
        message,
        identity.systemPrompt,
        conversation,
        announceToolCall,
        identity,
        streamSink,
      );
    } catch (error) {
      if (retries < 2) {
        if (streamSink) {
          await streamSink.reset();
        }
        return this.generate(
          message,
          conversation,
          announceToolCall,
          identity,
          streamSink,
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
  private buildTools(identity: Identity, message: MessageModel): AgentTool[] {
    // Guard against identity tools shadowing critical system tools
    const criticalToolNames = new Set([SCHEDULE_MESSAGE_TOOL_NAME, INTERMEDIATE_ANSWER_TOOL_NAME]);
    const conflictingTools = identity.tools.filter((tool) =>
      criticalToolNames.has(getAgentToolName(tool)),
    );
    if (conflictingTools.length > 0) {
      console.warn(
        `Identity "${identity.name}" defines tools that conflict with critical system tools: ${conflictingTools.map(getAgentToolName).join(', ')}. ` +
          'These will be ignored to prevent system instability.',
      );
    }

    // Merge global tools with identity-specific tools (excluding conflicts)
    const identityTools = identity.tools.filter(
      (tool) => !criticalToolNames.has(getAgentToolName(tool)),
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
    systemPrompt: string,
    conversation: Conversation,
    announceToolCall: (text: string) => Promise<number | null>,
    identity: Identity,
    streamSink?: StreamingTextSink,
  ): Promise<ChatGptAgentResponse> {
    const allTools = this.buildTools(identity, message);
    const canUseHostedImageGeneration = allTools.some(
      (tool) => getAgentToolName(tool) === IMAGE_GENERATION_TOOL_NAME,
    );

    const agent = this.agentStateGraphFactory.create({
      tools: allTools,
      llm: this.models.getModel(this.config.gptModel),
      announceToolCall,
      runWithUploadPhotoStatus: (task) =>
        this.telegramService.withUploadPhotoStatus(message.chatId, task),
    });

    const config = {
      configurable: {
        chatId: message.chatId,
        userId: message.fromId,
        telegramService: this.telegramService,
        pokemonTcgPocketService: this.pokemonTcgPocketService,
        identityByChatId: this.config.identityByChatId,
        identities: {
          schiParmelae: this.schiParmelaeIdentity,
          emulator: this.emulatorIdentity,
        },
        identityResolver: this.identityResolver,
      } satisfies ToolContext,
      callbacks: [this.callbackHandler],
    };
    const input = {
      messages: [new SystemMessage(systemPrompt), ...conversation.messages],
    };
    if (!streamSink) {
      const agentOutput = await agent.invoke(input, config);
      const sentImages = await this.sendGeneratedImages(agentOutput.messages, message.chatId);
      const content = getLastAiMessageTextContent(agentOutput.messages);
      assert(content !== null, 'Agent output must include an assistant message.');
      assert(
        content.length > 0 || sentImages > 0,
        'Agent output must include assistant text or generated images.',
      );
      return {
        message: {
          role: ChatGptRoles.Assistant,
          content: content.length > 0 ? content : 'Ich habe das Bild gesendet.',
        },
        toolCallMessageIds: agentOutput.toolCallMessageIds,
      };
    }

    const latestStateContainer: {
      value?: {
        messages: unknown[];
        toolCallMessageIds: number[];
      };
    } = {};
    const textBuffer = new HostedImageGenerationTextBuffer();
    let earlyFinalMessageId: number | undefined;
    let earlyFinalText: string | undefined;
    let stopUploadPhotoStatus: (() => void) | undefined;
    const finalMessageIds: number[] = [];

    const handleHostedImageGenerationStart = async () => {
      if (!canUseHostedImageGeneration || stopUploadPhotoStatus !== undefined) {
        return;
      }
      textBuffer.markImageGenerationStarted();
      const leadInText = textBuffer.getLeadInText();
      if (
        earlyFinalMessageId === undefined &&
        leadInText.trim().length > 0 &&
        isFinalizableStreamingTextSink(streamSink)
      ) {
        earlyFinalText = leadInText;
        earlyFinalMessageId = await streamSink.sendFinalText(earlyFinalText);
        finalMessageIds.push(earlyFinalMessageId);
      }
      stopUploadPhotoStatus = this.telegramService.startUploadPhotoStatus(message.chatId);
    };

    await withHostedImageGenerationStartHandler(handleHostedImageGenerationStart, async () => {
      const stream = await agent.stream(input, {
        ...config,
        streamMode: ['messages', 'values'],
      });

      for await (const [mode, payload] of stream) {
        if (mode === 'messages') {
          const [messageChunk] = payload as [
            { content: AIMessage['content']; contentBlocks?: AIMessage['contentBlocks'] },
            unknown,
          ];
          const textChunk = getAiMessageTextChunkContent(messageChunk);
          if (textChunk.length > 0) {
            textBuffer.append(textChunk);
            if (earlyFinalMessageId === undefined && !textBuffer.imageGenerationStarted) {
              void streamSink.appendText(textChunk);
            }
          }
          continue;
        }
        if (mode === 'values') {
          latestStateContainer.value = payload as {
            messages: unknown[];
            toolCallMessageIds: number[];
          };
        }
      }
    });

    assert(latestStateContainer.value, 'Agent stream must produce a final values payload.');
    const latestState = latestStateContainer.value;
    const finalStateContent = getLastAiMessageTextContent(latestState.messages);
    const content =
      earlyFinalText ??
      (finalStateContent !== null && finalStateContent.length > 0
        ? finalStateContent
        : textBuffer.getLeadInText());
    if (
      earlyFinalMessageId === undefined &&
      !textBuffer.imageGenerationStarted &&
      content.length > 0 &&
      isFinalizableStreamingTextSink(streamSink)
    ) {
      earlyFinalMessageId = await streamSink.sendFinalText(content);
      finalMessageIds.push(earlyFinalMessageId);
    }
    let sentImages = 0;
    try {
      sentImages = await this.sendGeneratedImages(latestState.messages, message.chatId);
    } finally {
      stopUploadPhotoStatus?.();
    }
    const postImageContent = textBuffer.getFollowUpText();
    if (postImageContent.length > 0 && isFinalizableStreamingTextSink(streamSink)) {
      const postImageMessageId = await streamSink.sendFinalText(postImageContent);
      finalMessageIds.push(postImageMessageId);
    }
    const responseContent = textBuffer.getCombinedText(content);
    assert(
      responseContent.length > 0 || sentImages > 0,
      'Agent stream must end with assistant text or generated images.',
    );
    return {
      message: {
        role: ChatGptRoles.Assistant,
        content: responseContent.length > 0 ? responseContent : 'Ich habe das Bild gesendet.',
      },
      toolCallMessageIds: latestState.toolCallMessageIds,
      finalMessageId: finalMessageIds.at(-1),
      finalMessageIds,
    };
  }

  private async sendGeneratedImages(messages: unknown[], chatId: bigint): Promise<number> {
    const generatedImages = getImageGenerationOutputs(messages);
    await Promise.all(
      generatedImages.map((image) =>
        this.telegramService.replyWithImage(image.dataUrl, image.caption, chatId),
      ),
    );
    return generatedImages.length;
  }
}
