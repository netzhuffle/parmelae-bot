import { BaseLanguageModelInput } from '@langchain/core/language_models/base';
import { AIMessage, AIMessageChunk } from '@langchain/core/messages';
import { Runnable } from '@langchain/core/runnables';
import {
  END,
  MessagesAnnotation,
  START,
  StateGraph,
} from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { ChatOpenAI } from '@langchain/openai';
import { StructuredTool, Tool } from 'langchain/tools';

function createAgentNode(
  model: Runnable<BaseLanguageModelInput, AIMessageChunk>,
) {
  return async ({ messages }: typeof MessagesAnnotation.State) => {
    const response = await model.invoke(messages);
    return { messages: [response] };
  };
}

function shouldGoToTools({ messages }: typeof MessagesAnnotation.State) {
  const lastMessage = messages[messages.length - 1] as AIMessage;
  if (lastMessage.tool_calls?.length) {
    return 'tools';
  }

  return END;
}

export class AgentStateGraphFactory {
  create({
    tools,
    llm,
  }: {
    tools: (StructuredTool | Tool)[];
    llm: ChatOpenAI;
  }) {
    const toolNode = new ToolNode(tools);
    const model = llm.bindTools(tools);
    const agentNode = createAgentNode(model);

    return new StateGraph(MessagesAnnotation)
      .addNode('agent', agentNode)
      .addNode('tools', toolNode)
      .addEdge(START, 'agent')
      .addConditionalEdges('agent', shouldGoToTools, ['tools', END])
      .addEdge('tools', 'agent')
      .compile();
  }
}
