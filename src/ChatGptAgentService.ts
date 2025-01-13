import assert from 'assert';
import { AgentExecutor } from 'langchain/agents';
import { BasePromptTemplate } from '@langchain/core/prompts';
import { BaseMessage } from '@langchain/core/messages';
import { Calculator } from '@langchain/community/tools/calculator';
import { injectable } from 'inversify';
import { GptModelsProvider } from './GptModelsProvider.js';
import {
  ChatGptMessage,
  ChatGptRoles,
} from './MessageGenerators/ChatGptMessage.js';
import { MinecraftBackupTool } from './Tools/MinecraftBackupTool.js';
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
import { ChatGptAgent } from './ChatGptAgent.js';
import { Conversation } from './Conversation.js';
import { IdentityQueryToolFactory } from './Tools/IdentityQueryToolFactory.js';
import { IdentitySetterToolFactory } from './Tools/IdentitySetterToolFactory.js';
import { diceTool } from './Tools/diceTool.js';
import { setContextVariable } from '@langchain/core/context';
import { TelegramService } from './TelegramService.js';
import { dallETool } from './Tools/dallETool.js';
import { DallEPromptGenerator } from './MessageGenerators/DallEPromptGenerator.js';
import { DallEService } from './DallEService.js';
import { dateTimeTool } from './Tools/dateTimeTool.js';
import { pokemonCardSearchTool } from './Tools/pokemonCardSearchTool.js';
import { PokemonTcgPocketService } from './PokemonTcgPocketService.js';
import { pokemonCardAddTool } from './Tools/pokemonCardAddTool.js';

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
  ];

  constructor(
    private readonly models: GptModelsProvider,
    private readonly config: Config,
    private readonly callbackHandlerFactory: CallbackHandlerFactory,
    private readonly intermediateAnswerToolFactory: IntermediateAnswerToolFactory,
    private readonly scheduleMessageToolFactory: ScheduleMessageToolFactory,
    private readonly identityQueryToolFactory: IdentityQueryToolFactory,
    private readonly identitySetterToolFactory: IdentitySetterToolFactory,
    telegram: TelegramService,
    dallEPromptGenerator: DallEPromptGenerator,
    dallEService: DallEService,
    pokemonTcgPocketService: PokemonTcgPocketService,
    gitHubToolFactory: GitHubToolFactory,
    googleSearchToolFactory: GoogleSearchToolFactory,
    gptModelQueryTool: GptModelQueryTool,
    gptModelSetterTool: GptModelSetterTool,
    minecraftStatusTool: MinecraftStatusTool,
    minecraftStartTool: MinecraftStartTool,
    minecraftStopTool: MinecraftStopTool,
    minecraftBackupTool: MinecraftBackupTool,
    webBrowserToolFactory: WebBrowserToolFactory,
  ) {
    setContextVariable('telegram', telegram);
    setContextVariable('dallEPromptGenerator', dallEPromptGenerator);
    setContextVariable('dallE', dallEService);
    setContextVariable('pokemonTcgPocket', pokemonTcgPocketService);
    this.tools = [
      ...this.tools,
      googleSearchToolFactory.create(),
      gptModelQueryTool,
      gptModelSetterTool,
      minecraftStatusTool,
      minecraftStartTool,
      minecraftStopTool,
      minecraftBackupTool,
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
   * @param basePrompt - Prompt Template with the following placeholders: {tools}, {tool_names}, MessagesPlaceholder('example'), MessagesPlaceholder('conversation'), MessagesPlaceholder('agent_scratchpad')
   */
  async generate(
    message: Message,
    basePrompt: BasePromptTemplate,
    example: BaseMessage[],
    conversation: Conversation,
    retries = 0,
  ): Promise<ChatGptMessage> {
    const executor = this.createAgentExecutor(message, basePrompt);

    try {
      const response = await executor.invoke({
        example,
        conversation: conversation.messages,
      });
      assert(typeof response.output === 'string');
      return {
        role: ChatGptRoles.Assistant,
        content: response.output,
      };
    } catch (error) {
      if (retries < 2) {
        return this.generate(
          message,
          basePrompt,
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

  private createAgentExecutor(
    message: Message,
    basePrompt: BasePromptTemplate,
  ): AgentExecutor {
    const chatId = message.chatId;
    setContextVariable('chatId', chatId);
    setContextVariable('userId', message.fromId);
    const tools = [
      ...this.tools,
      this.identityQueryToolFactory.create(chatId),
      this.identitySetterToolFactory.create(chatId),
      this.scheduleMessageToolFactory.create(chatId, message.fromId),
      this.intermediateAnswerToolFactory.create(chatId),
    ];
    const callbackHandler = this.callbackHandlerFactory.create(chatId);

    return AgentExecutor.fromAgentAndTools({
      tags: ['openai-functions'],
      agent: ChatGptAgent.fromLLMAndTools(
        this.models.getModel(this.config.gptModel),
        tools,
        { basePrompt },
      ),
      tools,
      callbacks: [callbackHandler],
      returnIntermediateSteps: true,
    });
  }
}
