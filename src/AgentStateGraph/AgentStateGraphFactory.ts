import { AIMessage } from '@langchain/core/messages';
import { END, START, StateGraph } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { injectable } from 'inversify';
import { StructuredTool, Tool } from 'langchain/tools';
import { AgentNodeFactory } from './AgentNodeFactory.js';
import { ToolsNodeFactory } from './ToolsNodeFactory.js';
import { ToolCallAnnouncementNodeFactory } from './ToolCallAnnouncementNodeFactory.js';
import { ToolResponsePersistenceNodeFactory } from './ToolResponsePersistenceNodeFactory.js';
import { StateAnnotation } from './StateAnnotation.js';

function routeAgentReply({ messages }: typeof StateAnnotation.State) {
  const lastMessage = messages[messages.length - 1] as AIMessage;
  if (lastMessage.tool_calls?.length) {
    return 'toolCallAnnouncement';
  }
  return END;
}

@injectable()
export class AgentStateGraphFactory {
  constructor(
    private readonly agentNodeFactory: AgentNodeFactory,
    private readonly toolsNodeFactory: ToolsNodeFactory,
    private readonly toolCallAnnouncementNodeFactory: ToolCallAnnouncementNodeFactory,
    private readonly toolResponsePersistenceNodeFactory: ToolResponsePersistenceNodeFactory,
  ) {}

  create({
    tools,
    llm,
    announceToolCall,
  }: {
    tools: (StructuredTool | Tool)[];
    llm: ChatOpenAI;
    announceToolCall: (text: string) => Promise<number | null>;
  }) {
    const model = llm.bindTools(tools);

    return new StateGraph(StateAnnotation)
      .addNode('agent', this.agentNodeFactory.create(model))
      .addNode(
        'toolCallAnnouncement',
        this.toolCallAnnouncementNodeFactory.create(announceToolCall),
      )
      .addNode('tools', this.toolsNodeFactory.create(tools))
      .addNode(
        'toolResponsePersistence',
        this.toolResponsePersistenceNodeFactory.create(),
      )
      .addEdge(START, 'agent')
      .addConditionalEdges('agent', routeAgentReply, [
        'toolCallAnnouncement',
        END,
      ])
      .addEdge('toolCallAnnouncement', 'tools')
      .addEdge('tools', 'toolResponsePersistence')
      .addEdge('toolResponsePersistence', 'agent')
      .compile();
  }
}
