import { AgentStateGraphFactory } from './AgentStateGraphFactory.js';
import { ChatOpenAI } from '@langchain/openai';
import { StructuredTool } from 'langchain/tools';

describe('AgentStateGraphFactory', () => {
  it('returns a compiled graph when create is called', () => {
    // Arrange
    const llm = {
      bindTools: () => ({ invoke: () => Promise.resolve(undefined) }),
    } as unknown as ChatOpenAI;
    const tools: StructuredTool[] = [];
    const factory = new AgentStateGraphFactory();

    // Act
    const graph = factory.create({ tools, llm });

    // Assert
    expect(graph).toBeDefined();
  });
});
