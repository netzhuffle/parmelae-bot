import { describe, it, expect, mock } from 'bun:test';

import { StructuredTool } from '@langchain/core/tools';
import { ChatOpenAI } from '@langchain/openai';

import { imageGenerationTool } from '../Tools/imageGenerationTool.js';
import { AgentStateGraphFactory } from './AgentStateGraphFactory.js';
import { ModelNodeFactory } from './ModelNodeFactory.js';
import { ToolCallAnnouncementNodeFactory } from './ToolCallAnnouncementNodeFactory.js';
import { ToolResponsePersistenceNodeFactory } from './ToolResponsePersistenceNodeFactory.js';
import { ToolsNodeFactory } from './ToolsNodeFactory.js';

describe('AgentStateGraphFactory', () => {
  it('should create factory with dependencies', () => {
    // Arrange
    const agentNodeFactory = mock(() => 'agent-node') as unknown as ModelNodeFactory;
    const toolsNodeFactory = mock(() => 'tools-node') as unknown as ToolsNodeFactory;
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
    expect(mockAgentNodeFactoryCreate).toHaveBeenCalledWith(mockBoundLlm, {
      runWithUploadPhotoStatus: undefined,
      useUploadPhotoStatus: false,
    });
    expect(mockToolsNodeFactoryCreate).toHaveBeenCalledWith(tools);
    expect(mockToolCallAnnouncementNodeFactoryCreate).toHaveBeenCalledWith(announceToolCall);
    expect(mockToolResponsePersistenceNodeFactoryCreate).toHaveBeenCalled();
  });

  it('passes hosted image generation to the model but not to the executable tools node', () => {
    const mockBoundLlm = { invoke: mock(() => Promise.resolve({})) };
    const mockBindTools = mock(() => mockBoundLlm);
    const mockLlm = {
      bindTools: mockBindTools,
    } as unknown as ChatOpenAI;
    const runWithUploadPhotoStatus = async <Result>(task: () => Promise<Result>) => task();

    const mockAgentNodeFactoryCreate = mock(() => () => ({}));
    const mockToolsNodeFactoryCreate = mock(() => () => ({}));
    const mockToolCallAnnouncementNodeFactoryCreate = mock(() => () => ({}));
    const mockToolResponsePersistenceNodeFactoryCreate = mock(() => () => ({}));

    const factory = new AgentStateGraphFactory(
      { create: mockAgentNodeFactoryCreate } as unknown as ModelNodeFactory,
      { create: mockToolsNodeFactoryCreate } as unknown as ToolsNodeFactory,
      {
        create: mockToolCallAnnouncementNodeFactoryCreate,
      } as unknown as ToolCallAnnouncementNodeFactory,
      {
        create: mockToolResponsePersistenceNodeFactoryCreate,
      } as unknown as ToolResponsePersistenceNodeFactory,
    );

    try {
      factory.create({
        tools: [imageGenerationTool],
        llm: mockLlm,
        announceToolCall: mock(() => Promise.resolve(123)),
        runWithUploadPhotoStatus,
      });
    } catch {
      // Expected to fail at LangGraph compilation, but our factory logic should execute.
    }

    expect(mockBindTools).toHaveBeenCalledWith([imageGenerationTool]);
    expect(mockAgentNodeFactoryCreate).toHaveBeenCalledWith(mockBoundLlm, {
      runWithUploadPhotoStatus,
      useUploadPhotoStatus: true,
    });
    expect(mockToolsNodeFactoryCreate).toHaveBeenCalledWith([]);
  });
});
