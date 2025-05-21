import { ToolNode } from '@langchain/langgraph/prebuilt';
import { injectable } from 'inversify';
import { StructuredTool, Tool } from 'langchain/tools';

@injectable()
export class ToolsNodeFactory {
  create(tools: (StructuredTool | Tool)[]) {
    return new ToolNode(tools);
  }
}
