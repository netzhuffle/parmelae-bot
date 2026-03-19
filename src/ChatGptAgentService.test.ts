import { describe, expect, it, mock } from 'bun:test';

import { AIMessage } from '@langchain/core/messages';

import { getAiMessageTextContent, getLastAiMessageTextContent } from './AiMessageTextContent.js';
import { ChatGptAgentService } from './ChatGptAgentService.js';
import { Conversation } from './Conversation.js';
import { ChatGptRoles } from './MessageGenerators/ChatGptMessage.js';
import type { Identity } from './MessageGenerators/Identities/Identity.js';
import { StreamingTextSink } from './StreamingTextSink.js';

describe('getAiMessageTextContent', () => {
  it('returns string content unchanged', () => {
    expect(getAiMessageTextContent(new AIMessage('Hello'))).toBe('Hello');
  });

  it('extracts text from Responses-style content blocks', () => {
    const message = new AIMessage({
      content: [{ type: 'text', text: 'Hello from responses' }],
    });

    expect(getAiMessageTextContent(message)).toBe('Hello from responses');
  });
});

describe('getLastAiMessageTextContent', () => {
  it('extracts text from serialized ai messages in LangGraph state', () => {
    expect(
      getLastAiMessageTextContent([
        { type: 'human', content: 'Question' },
        { type: 'ai', content: [{ type: 'text', text: 'Streamed answer' }] },
      ]),
    ).toBe('Streamed answer');
  });

  it('finds the last assistant message even when state ends with a non-ai message', () => {
    expect(
      getLastAiMessageTextContent([
        new AIMessage('Earlier answer'),
        { type: 'tool', content: 'tool output' },
      ]),
    ).toBe('Earlier answer');
  });
});

describe('ChatGptAgentService.generate', () => {
  it('retries when getReply rejects asynchronously', async () => {
    const service = Object.create(ChatGptAgentService.prototype) as ChatGptAgentService;
    const getReply = mock()
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValue({
        message: {
          role: ChatGptRoles.Assistant,
          content: 'Recovered response',
        },
        toolCallMessageIds: [123],
      });
    Object.assign(service as object, { getReply });

    const identity: Identity = {
      name: 'Test',
      systemPrompt: 'Test system prompt',
      conversationLength: 1,
      tools: [],
    };
    const resetMock = mock(async () => {
      return;
    });
    const streamSink: StreamingTextSink = {
      appendText: async () => {
        return;
      },
      reset: resetMock,
    };

    const result = await service.generate(
      undefined as never,
      new Conversation([]),
      async () => null,
      identity,
      streamSink,
    );

    expect(getReply).toHaveBeenCalledTimes(2);
    expect(resetMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      message: {
        role: ChatGptRoles.Assistant,
        content: 'Recovered response',
      },
      toolCallMessageIds: [123],
    });
  });
});
