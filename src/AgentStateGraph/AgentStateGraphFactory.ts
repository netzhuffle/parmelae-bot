import { AIMessage } from '@langchain/core/messages';
import { END, START, StateGraph } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { injectable } from 'inversify';
import { StructuredTool, Tool } from '@langchain/core/tools';
import { ModelNodeFactory } from './ModelNodeFactory.js';
import { ToolsNodeFactory } from './ToolsNodeFactory.js';
import { ToolCallAnnouncementNodeFactory } from './ToolCallAnnouncementNodeFactory.js';
import { ToolResponsePersistenceNodeFactory } from './ToolResponsePersistenceNodeFactory.js';
import { StateAnnotation } from './StateAnnotation.js';

function routeModelReply({ messages }: typeof StateAnnotation.State) {
  const lastMessage = messages[messages.length - 1] as AIMessage;
  if (lastMessage.tool_calls?.length) {
    return 'toolCallAnnouncement';
  }
  return END;
}

@injectable()
export class AgentStateGraphFactory {
  constructor(
    private readonly modelNodeFactory: ModelNodeFactory,
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
      .addNode('model', this.modelNodeFactory.create(model))
      .addNode(
        'toolCallAnnouncement',
        this.toolCallAnnouncementNodeFactory.create(announceToolCall),
      )
      .addNode('tools', this.toolsNodeFactory.create(tools))
      .addNode(
        'toolResponsePersistence',
        this.toolResponsePersistenceNodeFactory.create(),
      )
      .addEdge(START, 'model')
      .addConditionalEdges('model', routeModelReply, [
        'toolCallAnnouncement',
        END,
      ])
      .addEdge('toolCallAnnouncement', 'tools')
      .addEdge('tools', 'toolResponsePersistence')
      .addEdge('toolResponsePersistence', 'model')
      .compile();
  }
}
