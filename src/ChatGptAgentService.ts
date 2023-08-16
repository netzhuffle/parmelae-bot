import assert from 'assert';
import { AgentExecutor } from 'langchain/agents';
import { BasePromptTemplate } from 'langchain/prompts';
import { BaseMessage } from 'langchain/schema';
import { Calculator } from 'langchain/tools/calculator';
import { injectable } from 'inversify';
import { GptModelsProvider } from './GptModelsProvider';
import {
  ChatGptMessage,
  ChatGptRoles,
} from './MessageGenerators/ChatGptMessage';
import { DallEToolFactory } from './Tools/DallEToolFactory';
import { MinecraftBackupTool } from './Tools/MinecraftBackupTool';
import { MinecraftStartTool } from './Tools/MinecraftStartTool';
import { MinecraftStatusTool } from './Tools/MinecraftStatusTool';
import { MinecraftStopTool } from './Tools/MinecraftStopTool';
import { SwissConstitutionQaToolFactory } from './Tools/SwissConstitutionQaToolFactory';
import { WebBrowserToolFactory } from './Tools/WebBrowserToolFactory';
import { GoogleSearchToolFactory } from './Tools/GoogleSearchToolFactory';
import { GitHubToolFactory } from './Tools/GitHubToolFactory';
import { GptModelQueryTool } from './Tools/GptModelQueryTool';
import { GptModelSetterTool } from './Tools/GptModelSetterTool';
import { Config } from './Config';
import { Tool } from 'langchain/tools';
import { Message } from '@prisma/client';
import { DiceToolFactory } from './Tools/DiceToolFactory';
import { IntermediateAnswerToolFactory } from './Tools/IntermediateAnswerToolFactory';
import { CallbackHandlerFactory } from './CallbackHandlerFactory';
import { ScheduleMessageToolFactory } from './Tools/ScheduleMessageToolFactory';
import { DateTimeTool } from './Tools/DateTimeTool';
import { ErrorService } from './ErrorService';
import { ChatGptAgent } from './ChatGptAgent';

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
    conversation: BaseMessage[],
    retries = 0,
  ): Promise<ChatGptMessage> {
    const executor = this.createAgentExecutor(message, basePrompt);

    try {
      const response = await executor.call({
        example,
        conversation,
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
        this.config.useGpt4 ? this.models.gpt4 : this.models.chatGpt,
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
