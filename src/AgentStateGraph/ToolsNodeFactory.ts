import { StructuredTool, Tool } from '@langchain/core/tools';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { injectable } from 'inversify';

@injectable()
export class ToolsNodeFactory {
  create(tools: (StructuredTool | Tool)[]) {
    return new ToolNode(tools);
  }
}
