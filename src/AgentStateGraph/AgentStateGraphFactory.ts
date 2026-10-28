import { AIMessage } from '@langchain/core/messages';
import { END, START, StateGraph } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { injectable } from 'inversify';

import { AgentTool, getAgentToolName, isExecutableAgentTool } from '../AgentTool.js';
import { IMAGE_GENERATION_TOOL_NAME } from '../Tools/imageGenerationTool.js';
import { ModelNodeFactory } from './ModelNodeFactory.js';
import { StateAnnotation } from './StateAnnotation.js';
import { ToolCallAnnouncementNodeFactory } from './ToolCallAnnouncementNodeFactory.js';
import { ToolResponsePersistenceNodeFactory } from './ToolResponsePersistenceNodeFactory.js';
import { ToolsNodeFactory } from './ToolsNodeFactory.js';

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
    runWithUploadPhotoStatus,
  }: {
    tools: AgentTool[];
    llm: ChatOpenAI;
    announceToolCall: (text: string) => Promise<number | null>;
    runWithUploadPhotoStatus?: <Result>(task: () => Promise<Result>) => Promise<Result>;
  }) {
    const model = llm.bindTools(tools as Parameters<ChatOpenAI['bindTools']>[0]);
    const executableTools = tools.filter(isExecutableAgentTool);
    const useUploadPhotoStatus = tools.some(
      (tool) => getAgentToolName(tool) === IMAGE_GENERATION_TOOL_NAME,
    );

    return new StateGraph(StateAnnotation)
      .addNode(
        'model',
        this.modelNodeFactory.create(model, {
          runWithUploadPhotoStatus,
          useUploadPhotoStatus,
        }),
      )
      .addNode(
        'toolCallAnnouncement',
        this.toolCallAnnouncementNodeFactory.create(announceToolCall),
      )
      .addNode('tools', this.toolsNodeFactory.create(executableTools))
      .addNode('toolResponsePersistence', this.toolResponsePersistenceNodeFactory.create())
      .addEdge(START, 'model')
      .addConditionalEdges('model', routeModelReply, ['toolCallAnnouncement', END])
      .addEdge('toolCallAnnouncement', 'tools')
      .addEdge('tools', 'toolResponsePersistence')
      .addEdge('toolResponsePersistence', 'model')
      .compile();
  }
}
