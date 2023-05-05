import assert from 'assert';
import { AgentExecutor, ChatConversationalAgent } from 'langchain/agents';
import { CallbackManager } from 'langchain/callbacks';
import { LLMChain } from 'langchain/chains';
import { BasePromptTemplate } from 'langchain/prompts';
import { BaseChatMessage } from 'langchain/schema';
import { BufferMemory, ChatMessageHistory } from 'langchain/memory';
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

/** ChatGPT Agent Service */
@injectable()
export class ChatGptAgentService {
  private readonly tools: Tool[] = [new Calculator()];

  constructor(
    private readonly models: GptModelsProvider,
    private readonly config: Config,
    private readonly callbackManager: CallbackManager,
    private readonly dallEToolFactory: DallEToolFactory,
    private readonly diceToolFactory: DiceToolFactory,
    private readonly intermediateAnswerToolFactory: IntermediateAnswerToolFactory,
    gitHubToolFactory: GitHubToolFactory,
    googleSearchToolFactory: GoogleSearchToolFactory,
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
   * @param prompt - Prompt Template with the following placeholders: {tools}, {tool_names}, MessagesPlaceholder('example'), MessagesPlaceholder('conversation'), MessagesPlaceholder('agent_scratchpad')
   */
  async generate(
    message: Message,
    prompt: BasePromptTemplate,
    example: BaseChatMessage[],
    conversation: BaseChatMessage[],
    retries = 0,
  ): Promise<ChatGptMessage> {
    const tools = [
      ...this.tools,
      this.dallEToolFactory.create(message),
      this.diceToolFactory.create(message.chatId),
      this.intermediateAnswerToolFactory.create(message),
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

    try {
      const response = await executor.call({
        tools: toolStrings,
        tool_names: toolNames,
        example,
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
          prompt,
          example,
          conversation,
          retries + 1,
        );
      }
      console.error('Error when generating agent message', error);
      assert(error instanceof Error);
      return {
        role: ChatGptRoles.Assistant,
        content: `Fehler: ${error.message}`,
      };
    }
  }
}
