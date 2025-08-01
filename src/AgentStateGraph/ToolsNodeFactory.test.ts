import { describe, it, mock, expect } from 'bun:test';
import { ToolsNodeFactory } from './ToolsNodeFactory.js';
import { StructuredTool } from 'langchain/tools';
import { ToolNode } from '@langchain/langgraph/prebuilt';

void mock.module('@langchain/langgraph/prebuilt', () => ({
  ToolNode: mock((tools: StructuredTool[]) => ({ tools })),
}));

describe('ToolsNodeFactory', () => {
  it('returns a ToolNode constructed with the provided tools', () => {
    // Arrange
    const tools: StructuredTool[] = [
      { name: 'tool1', call: mock() } as unknown as StructuredTool,
      { name: 'tool2', call: mock() } as unknown as StructuredTool,
    ];
    const factory = new ToolsNodeFactory();

    // Act
    const node = factory.create(tools);

    // Assert
    expect(ToolNode).toHaveBeenCalledWith(tools);
    expect(node.tools).toBe(tools);
  });
});
