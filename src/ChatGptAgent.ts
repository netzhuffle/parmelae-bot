import { BasePromptTemplate } from '@langchain/core/prompts';
import { AgentArgs, OpenAIAgent } from 'langchain/agents';
import { BaseLanguageModelInterface } from '@langchain/core/language_models/base';
import { StructuredTool } from '@langchain/core/tools';
import { LLMChain } from 'langchain/chains';

export interface ChatGptAgentCreatePromptArgs {
  basePrompt: BasePromptTemplate;
}

export class ChatGptAgent extends OpenAIAgent {
  static fromLLMAndTools(
    llm: BaseLanguageModelInterface,
    tools: StructuredTool[],
    args: ChatGptAgentCreatePromptArgs & Pick<AgentArgs, 'callbacks'>,
  ) {
    ChatGptAgent.validateTools(tools);
    if (llm._modelType() !== 'base_chat_model' || llm._llmType() !== 'openai') {
      throw new Error('ChatGptAgent requires an OpenAI chat model');
    }
    const chain = new LLMChain({
      prompt: args.basePrompt,
      llm,
      callbacks: args?.callbacks,
    });
    return new ChatGptAgent({
      llmChain: chain,
      allowedTools: tools.map((t) => t.name),
      tools,
    });
  }
}
