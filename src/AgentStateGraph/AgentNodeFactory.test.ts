import { describe, it, expect } from 'bun:test';
import { AgentNodeFactory } from './AgentNodeFactory.js';
import { AIMessageChunk } from '@langchain/core/messages';
import { ChatOpenAiFake } from '../Fakes/ChatOpenAiFake.js';
import { StateAnnotation } from './StateAnnotation.js';

describe('AgentNodeFactory', () => {
  it('returns a function that calls model.invoke and returns the response', async () => {
    // Arrange
    const aiMessage = new AIMessageChunk('hello');
    const fakeModel = new ChatOpenAiFake(aiMessage);
    const factory = new AgentNodeFactory();
    const messages = [aiMessage];
    const state: typeof StateAnnotation.State = {
      messages,
      toolExecution: {},
      toolCallMessageIds: [],
    };
    const node = factory.create(fakeModel);

    // Act
    const result = await node(state);

    // Assert
    expect(fakeModel.request).toStrictEqual(messages);
    expect(result).toEqual({ messages: [aiMessage] });
  });
});
