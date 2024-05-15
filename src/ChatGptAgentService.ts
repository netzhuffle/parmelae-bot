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
import { DallEToolFactory } from './Tools/DallEToolFactory.js';
import { MinecraftBackupTool } from './Tools/MinecraftBackupTool.js';
import { MinecraftStartTool } from './Tools/MinecraftStartTool.js';
import { MinecraftStatusTool } from './Tools/MinecraftStatusTool.js';
import { MinecraftStopTool } from './Tools/MinecraftStopTool.js';
import { SwissConstitutionQaToolFactory } from './Tools/SwissConstitutionQaToolFactory.js';
import { WebBrowserToolFactory } from './Tools/WebBrowserToolFactory.js';
import { GoogleSearchToolFactory } from './Tools/GoogleSearchToolFactory.js';
import { GitHubToolFactory } from './Tools/GitHubToolFactory.js';
import { GptModelQueryTool } from './Tools/GptModelQueryTool.js';
import { GptModelSetterTool } from './Tools/GptModelSetterTool.js';
import { Config } from './Config.js';
import { Tool } from 'langchain/tools';
import { Message } from '@prisma/client';
import { DiceToolFactory } from './Tools/DiceToolFactory.js';
import { IntermediateAnswerToolFactory } from './Tools/IntermediateAnswerToolFactory.js';
import { CallbackHandlerFactory } from './CallbackHandlerFactory.js';
import { ScheduleMessageToolFactory } from './Tools/ScheduleMessageToolFactory.js';
import { DateTimeTool } from './Tools/DateTimeTool.js';
import { ErrorService } from './ErrorService.js';
import { ChatGptAgent } from './ChatGptAgent.js';
import { Conversation } from './Conversation.js';

/** ChatGPT Agent Service */
@injectable()
export class ChatGptAgentService {
  private readonly tools: Tool[] = [new Calculator()];

  constructor(
    private readonly models: GptModelsProvider,
    private readonly config: Config,
    private readonly callbackHandlerFactory: CallbackHandlerFactory,
    private readonly dallEToolFactory: DallEToolFactory,
    private readonly diceToolFactory: DiceToolFactory,
    private readonly intermediateAnswerToolFactory: IntermediateAnswerToolFactory,
    private readonly scheduleMessageToolFactory: ScheduleMessageToolFactory,
    gitHubToolFactory: GitHubToolFactory,
    googleSearchToolFactory: GoogleSearchToolFactory,
    dateTimeTool: DateTimeTool,
    gptModelQueryTool: GptModelQueryTool,
    gptModelSetterTool: GptModelSetterTool,
    minecraftStatusTool: MinecraftStatusTool,
    minecraftStartTool: MinecraftStartTool,
    minecraftStopTool: MinecraftStopTool,
    minecraftBackupTool: MinecraftBackupTool,
    swissConstitutionQaToolFactory: SwissConstitutionQaToolFactory,
    webBrowserToolFactory: WebBrowserToolFactory,
  ) {
    this.tools = [
      ...this.tools,
      googleSearchToolFactory.create(),
      dateTimeTool,
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
    swissConstitutionQaToolFactory
      .create()
      .then((tool) => tools.push(tool))
      .catch((e) =>
        console.error(
          'Could not create swiss-constitution-qa tool, continuing without',
          e,
        ),
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
    const executor = this.createAgentExecutor(
      message,
      basePrompt,
      conversation.needsVision,
    );

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
    needsVision: boolean,
  ): AgentExecutor {
    const chatId = message.chatId;
    const tools = [
      ...this.tools,
      this.dallEToolFactory.create(chatId),
      this.diceToolFactory.create(chatId),
      this.scheduleMessageToolFactory.create(chatId, message.fromId),
      this.intermediateAnswerToolFactory.create(chatId),
    ];
    const callbackHandler = this.callbackHandlerFactory.create(chatId);

    return AgentExecutor.fromAgentAndTools({
      tags: ['openai-functions'],
      agent: ChatGptAgent.fromLLMAndTools(
        this.models.getModel(this.config.gptModel, needsVision),
        tools,
        { basePrompt },
      ),
      tools,
      verbose: true,
      callbacks: [callbackHandler],
      returnIntermediateSteps: true,
    });
  }
}
