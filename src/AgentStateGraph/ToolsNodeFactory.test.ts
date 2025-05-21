import { ToolsNodeFactory } from './ToolsNodeFactory.js';
import { StructuredTool } from 'langchain/tools';

// Mock ToolNode from @langchain/langgraph/prebuilt
jest.mock('@langchain/langgraph/prebuilt', () => ({
  ToolNode: jest
    .fn()
    .mockImplementation((tools: StructuredTool[]) => ({ tools })),
}));

import { ToolNode } from '@langchain/langgraph/prebuilt';

describe('ToolsNodeFactory', () => {
  it('returns a ToolNode constructed with the provided tools', () => {
    // Arrange
    const tools: StructuredTool[] = [
      { name: 'tool1', call: jest.fn() } as unknown as StructuredTool,
      { name: 'tool2', call: jest.fn() } as unknown as StructuredTool,
    ];
    const factory = new ToolsNodeFactory();

    // Act
    const node = factory.create(tools);

    // Assert
    expect(ToolNode).toHaveBeenCalledWith(tools);
    expect(node.tools).toBe(tools);
  });
});
