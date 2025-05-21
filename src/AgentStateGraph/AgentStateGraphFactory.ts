import { AIMessage } from '@langchain/core/messages';
import {
  END,
  MessagesAnnotation,
  START,
  StateGraph,
} from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { injectable } from 'inversify';
import { StructuredTool, Tool } from 'langchain/tools';
import { AgentNodeFactory } from './AgentNodeFactory.js';
import { ToolsNodeFactory } from './ToolsNodeFactory.js';

function routeAgentReply({ messages }: typeof MessagesAnnotation.State) {
  const lastMessage = messages[messages.length - 1] as AIMessage;
  if (lastMessage.tool_calls?.length) {
    return 'tools';
  }

  return END;
}

@injectable()
export class AgentStateGraphFactory {
  constructor(
    private readonly agentNodeFactory: AgentNodeFactory,
    private readonly toolsNodeFactory: ToolsNodeFactory,
  ) {}

  create({
    tools,
    llm,
  }: {
    tools: (StructuredTool | Tool)[];
    llm: ChatOpenAI;
  }) {
    const model = llm.bindTools(tools);

    return new StateGraph(MessagesAnnotation)
      .addNode('agent', this.agentNodeFactory.create(model))
      .addNode('tools', this.toolsNodeFactory.create(tools))
      .addEdge(START, 'agent')
      .addConditionalEdges('agent', routeAgentReply, ['tools', END])
      .addEdge('tools', 'agent')
      .compile();
  }
}
