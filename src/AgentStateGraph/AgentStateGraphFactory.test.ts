import { AgentStateGraphFactory } from './AgentStateGraphFactory.js';
import { AgentNodeFactory } from './AgentNodeFactory.js';
import { ToolsNodeFactory } from './ToolsNodeFactory.js';
import { ToolCallAnnouncementNodeFactory } from './ToolCallAnnouncementNodeFactory.js';
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
    const toolCallAnnouncementNodeFactory = {
      create: jest.fn(() => jest.fn()),
    } as unknown as ToolCallAnnouncementNodeFactory;
    const factory = new AgentStateGraphFactory(
      agentNodeFactory,
      toolsNodeFactory,
      toolCallAnnouncementNodeFactory,
    );
    const announceToolCall = jest.fn(() => Promise.resolve(123));

    // Act
    const graph = factory.create({ tools, llm, announceToolCall });

    // Assert
    expect(graph).toBeDefined();
    expect(typeof graph).toBe('object');
    expect(graph).not.toBeNull();
    expect(toolCallAnnouncementNodeFactory.create).toHaveBeenCalledWith(
      announceToolCall,
    );
  });
});
