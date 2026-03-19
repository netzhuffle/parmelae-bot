import { describe, expect, it, mock } from 'bun:test';

import { AIMessage } from '@langchain/core/messages';

import { ChatGptAgentService, getAiMessageTextContent } from './ChatGptAgentService.js';
import { Conversation } from './Conversation.js';
import { ChatGptRoles } from './MessageGenerators/ChatGptMessage.js';
import type { Identity } from './MessageGenerators/Identities/Identity.js';

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

    const result = await service.generate(
      undefined as never,
      new Conversation([]),
      async () => null,
      identity,
    );

    expect(getReply).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      message: {
        role: ChatGptRoles.Assistant,
        content: 'Recovered response',
      },
      toolCallMessageIds: [123],
    });
  });
});
