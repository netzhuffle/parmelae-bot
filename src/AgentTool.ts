import { StructuredTool, Tool } from '@langchain/core/tools';
import type { ServerTool } from '@langchain/core/tools';

export type ExecutableAgentTool = StructuredTool | Tool;
export type AgentTool = ExecutableAgentTool | ServerTool;

export function getAgentToolName(tool: AgentTool): string {
  if ('name' in tool && typeof tool.name === 'string') {
    return tool.name;
  }

  if ('type' in tool && typeof tool.type === 'string') {
    return tool.type;
  }

  return 'unknown';
}

export function isExecutableAgentTool(tool: AgentTool): tool is ExecutableAgentTool {
  return 'name' in tool && typeof tool.name === 'string' && 'invoke' in tool;
}
