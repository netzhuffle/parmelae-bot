import { AgentNodeFactory } from './AgentNodeFactory.js';
import { AIMessage } from '@langchain/core/messages';
import { MessagesAnnotation } from '@langchain/langgraph';
import { ChatOpenAiFake } from '../Fakes/ChatOpenAiFake.js';

describe('AgentNodeFactory', () => {
  it('returns a function that calls model.invoke and returns the response', async () => {
    // Arrange
    const aiMessage = new AIMessage('hello');
    const fakeModel = new ChatOpenAiFake(aiMessage);
    const factory = new AgentNodeFactory();
    const messages = [aiMessage];
    const state: typeof MessagesAnnotation.State = { messages };
    const node = factory.create(fakeModel);

    // Act
    const result = await node(state);

    // Assert
    expect(fakeModel.request).toStrictEqual(messages);
    expect(result).toEqual({ messages: [aiMessage] });
  });
});
