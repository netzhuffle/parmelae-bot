import { AgentStateGraphFactory } from './AgentStateGraphFactory.js';
import { AgentNodeFactory } from './AgentNodeFactory.js';
import { ToolsNodeFactory } from './ToolsNodeFactory.js';
import { ChatOpenAI } from '@langchain/openai';
import { StructuredTool } from 'langchain/tools';

describe('AgentStateGraphFactory', () => {
  it('returns a compiled graph when create is called', () => {
    // Arrange
    const llm = {
      bindTools: () => ({ invoke: () => Promise.resolve(undefined) }),
    } as unknown as ChatOpenAI;
    const tools: StructuredTool[] = [];
    const agentNodeFactory = new AgentNodeFactory();
    const toolsNodeFactory = new ToolsNodeFactory();
    const factory = new AgentStateGraphFactory(
      agentNodeFactory,
      toolsNodeFactory,
    );

    // Act
    const graph = factory.create({ tools, llm });

    // Assert
    expect(graph).toBeDefined();
    expect(typeof graph).toBe('object');
    expect(graph).not.toBeNull();
  });
});
