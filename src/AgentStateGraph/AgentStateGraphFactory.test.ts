import { describe, it, expect, mock } from 'bun:test';
import { AgentStateGraphFactory } from './AgentStateGraphFactory.js';
import { ModelNodeFactory } from './ModelNodeFactory.js';
import { ToolsNodeFactory } from './ToolsNodeFactory.js';
import { ToolCallAnnouncementNodeFactory } from './ToolCallAnnouncementNodeFactory.js';
import { ToolResponsePersistenceNodeFactory } from './ToolResponsePersistenceNodeFactory.js';
import { ChatOpenAI } from '@langchain/openai';
import { StructuredTool } from '@langchain/core/tools';

describe('AgentStateGraphFactory', () => {
  it('should create factory with dependencies', () => {
    // Arrange
    const agentNodeFactory = mock(
      () => 'agent-node',
    ) as unknown as ModelNodeFactory;
    const toolsNodeFactory = mock(
      () => 'tools-node',
    ) as unknown as ToolsNodeFactory;
    const toolCallAnnouncementNodeFactory = mock(
      () => 'announcement-node',
    ) as unknown as ToolCallAnnouncementNodeFactory;
    const toolResponsePersistenceNodeFactory = mock(
      () => 'persistence-node',
    ) as unknown as ToolResponsePersistenceNodeFactory;

    // Act
    const factory = new AgentStateGraphFactory(
      agentNodeFactory,
      toolsNodeFactory,
      toolCallAnnouncementNodeFactory,
      toolResponsePersistenceNodeFactory,
    );

    // Assert
    expect(factory).toBeDefined();
    expect(factory).toBeInstanceOf(AgentStateGraphFactory);
  });

  it('should call factory create methods when building graph', () => {
    // Arrange
    const mockBoundLlm = { invoke: mock(() => Promise.resolve({})) };
    const mockBindTools = mock(() => mockBoundLlm);
    const mockLlm = {
      bindTools: mockBindTools,
    } as unknown as ChatOpenAI;
    const tools: StructuredTool[] = [];
    const announceToolCall = mock(() => Promise.resolve(123));

    // Create mock functions separately for proper assertion tracking
    const mockAgentNodeFactoryCreate = mock(() => () => ({}));
    const mockToolsNodeFactoryCreate = mock(() => () => ({}));
    const mockToolCallAnnouncementNodeFactoryCreate = mock(() => () => ({}));
    const mockToolResponsePersistenceNodeFactoryCreate = mock(() => () => ({}));

    const agentNodeFactory = {
      create: mockAgentNodeFactoryCreate,
    } as unknown as ModelNodeFactory;
    const toolsNodeFactory = {
      create: mockToolsNodeFactoryCreate,
    } as unknown as ToolsNodeFactory;
    const toolCallAnnouncementNodeFactory = {
      create: mockToolCallAnnouncementNodeFactoryCreate,
    } as unknown as ToolCallAnnouncementNodeFactory;
    const toolResponsePersistenceNodeFactory = {
      create: mockToolResponsePersistenceNodeFactoryCreate,
    } as unknown as ToolResponsePersistenceNodeFactory;

    const factory = new AgentStateGraphFactory(
      agentNodeFactory,
      toolsNodeFactory,
      toolCallAnnouncementNodeFactory,
      toolResponsePersistenceNodeFactory,
    );

    // Act & Assert - Test should validate calls without requiring graph compilation
    try {
      factory.create({ tools, llm: mockLlm, announceToolCall });
    } catch {
      // Expected to fail at LangGraph compilation, but our factory logic should execute
    }

    // Verify our factory methods were called using stored mock references
    expect(mockBindTools).toHaveBeenCalledWith(tools);
    expect(mockAgentNodeFactoryCreate).toHaveBeenCalledWith(mockBoundLlm);
    expect(mockToolsNodeFactoryCreate).toHaveBeenCalledWith(tools);
    expect(mockToolCallAnnouncementNodeFactoryCreate).toHaveBeenCalledWith(
      announceToolCall,
    );
    expect(mockToolResponsePersistenceNodeFactoryCreate).toHaveBeenCalled();
  });
});
