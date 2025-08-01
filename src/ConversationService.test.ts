import { describe, beforeEach, it, expect } from 'bun:test';
import { ConversationService } from './ConversationService.js';
import { MessageHistoryService } from './MessageHistoryService.js';
import { MessageHistoryServiceFake } from './Fakes/MessageHistoryServiceFake.js';
import { TelegramServiceFake } from './Fakes/TelegramServiceFake.js';
import { ConfigFake } from './Fakes/ConfigFake.js';
import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import { MessageWithUserAndToolMessages } from './Repositories/Types.js';

describe('ConversationService', () => {
  let service: ConversationService;
  let messageHistory: MessageHistoryServiceFake;
  let telegram: TelegramServiceFake;
  let config: ConfigFake;

  beforeEach(() => {
    messageHistory = new MessageHistoryServiceFake();
    telegram = new TelegramServiceFake();
    config = new ConfigFake();
    service = new ConversationService(
      messageHistory as unknown as MessageHistoryService,
      telegram,
      config,
    );
  });

  describe('getConversation', () => {
    it('should convert simple user message to HumanMessage', async () => {
      const messages: MessageWithUserAndToolMessages[] = [
        {
          id: 1,
          telegramMessageId: 123,
          chatId: BigInt(456),
          fromId: BigInt(789),
          sentAt: new Date(),
          editedAt: null,
          replyToMessageId: null,
          text: 'Hello world',
          imageFileId: null,
          stickerFileId: null,
          toolCalls: null,
          messageAfterToolCallsId: null,
          from: {
            id: BigInt(789),
            isBot: false,
            firstName: 'John',
            lastName: 'Doe',
            username: 'johndoe',
            languageCode: 'en',
          },
          toolMessages: [],
        },
      ];
      messageHistory.setMessages(messages);

      const result = await service.getConversation(1, 1);

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toBeInstanceOf(HumanMessage);
      expect(result.messages[0].content).toBe('Hello world');
    });

    it('should convert bot message to AIMessage', async () => {
      const messages: MessageWithUserAndToolMessages[] = [
        {
          id: 1,
          telegramMessageId: 123,
          chatId: BigInt(456),
          fromId: BigInt(789),
          sentAt: new Date(),
          editedAt: null,
          replyToMessageId: null,
          text: 'Bot response',
          imageFileId: null,
          stickerFileId: null,
          toolCalls: null,
          messageAfterToolCallsId: null,
          from: {
            id: BigInt(789),
            isBot: true,
            firstName: 'Bot',
            lastName: null,
            username: 'testbot',
            languageCode: null,
          },
          toolMessages: [],
        },
      ];
      messageHistory.setMessages(messages);

      const result = await service.getConversation(1, 1);

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toBeInstanceOf(AIMessage);
      expect(result.messages[0].content).toBe('Bot response');
    });

    it('should convert bot message with tool calls to AIMessage with tool_calls', async () => {
      const toolCalls = [
        { id: 'call-123', name: 'search_tool', args: { query: 'test' } },
      ];
      const messages: MessageWithUserAndToolMessages[] = [
        {
          id: 1,
          telegramMessageId: 123,
          chatId: BigInt(456),
          fromId: BigInt(789),
          sentAt: new Date(),
          editedAt: null,
          replyToMessageId: null,
          text: 'Using search tool',
          imageFileId: null,
          stickerFileId: null,
          toolCalls: toolCalls,
          messageAfterToolCallsId: null,
          from: {
            id: BigInt(789),
            isBot: true,
            firstName: 'Bot',
            lastName: null,
            username: 'testbot',
            languageCode: null,
          },
          toolMessages: [],
        },
      ];
      messageHistory.setMessages(messages);

      const result = await service.getConversation(1, 1);

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toBeInstanceOf(AIMessage);
      const aiMessage = result.messages[0] as AIMessage;
      expect(aiMessage.content).toBe('Using search tool');
      expect(aiMessage.tool_calls).toEqual(toolCalls);
    });

    it('should extract clean AI content when message has tool calls with announcements', async () => {
      const toolCalls = [
        { id: 'call-123', name: 'search_tool', args: { query: 'test' } },
      ];
      const messages: MessageWithUserAndToolMessages[] = [
        {
          id: 1,
          telegramMessageId: 123,
          chatId: BigInt(456),
          fromId: BigInt(789),
          sentAt: new Date(),
          editedAt: null,
          replyToMessageId: null,
          text: 'I will search for that information.\n[search_tool: {query: "test"}]',
          imageFileId: null,
          stickerFileId: null,
          toolCalls: toolCalls,
          messageAfterToolCallsId: null,
          from: {
            id: BigInt(789),
            isBot: true,
            firstName: 'Bot',
            lastName: null,
            username: 'testbot',
            languageCode: null,
          },
          toolMessages: [],
        },
      ];
      messageHistory.setMessages(messages);

      const result = await service.getConversation(1, 1);

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toBeInstanceOf(AIMessage);
      const aiMessage = result.messages[0] as AIMessage;
      expect(aiMessage.content).toBe('I will search for that information.');
      expect(aiMessage.tool_calls).toEqual(toolCalls);
    });

    it('should have empty content when message contains only tool calls', async () => {
      const toolCalls = [
        { id: 'call-123', name: 'search_tool', args: { query: 'test' } },
        { id: 'call-456', name: 'calc_tool', args: { expression: '2+2' } },
      ];
      const messages: MessageWithUserAndToolMessages[] = [
        {
          id: 1,
          telegramMessageId: 123,
          chatId: BigInt(456),
          fromId: BigInt(789),
          sentAt: new Date(),
          editedAt: null,
          replyToMessageId: null,
          text: '[search_tool: {query: "test"}]\n[calc_tool: {expression: "2+2"}]',
          imageFileId: null,
          stickerFileId: null,
          toolCalls: toolCalls,
          messageAfterToolCallsId: null,
          from: {
            id: BigInt(789),
            isBot: true,
            firstName: 'Bot',
            lastName: null,
            username: 'testbot',
            languageCode: null,
          },
          toolMessages: [],
        },
      ];
      messageHistory.setMessages(messages);

      const result = await service.getConversation(1, 1);

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toBeInstanceOf(AIMessage);
      const aiMessage = result.messages[0] as AIMessage;
      expect(aiMessage.content).toBe('');
      expect(aiMessage.tool_calls).toEqual(toolCalls);
    });

    it('should handle whitespace-only content when message has tool calls', async () => {
      const toolCalls = [
        { id: 'call-123', name: 'search_tool', args: { query: 'test' } },
      ];
      const messages: MessageWithUserAndToolMessages[] = [
        {
          id: 1,
          telegramMessageId: 123,
          chatId: BigInt(456),
          fromId: BigInt(789),
          sentAt: new Date(),
          editedAt: null,
          replyToMessageId: null,
          text: '   \n\t  ',
          imageFileId: null,
          stickerFileId: null,
          toolCalls: toolCalls,
          messageAfterToolCallsId: null,
          from: {
            id: BigInt(789),
            isBot: true,
            firstName: 'Bot',
            lastName: null,
            username: 'testbot',
            languageCode: null,
          },
          toolMessages: [],
        },
      ];
      messageHistory.setMessages(messages);

      const result = await service.getConversation(1, 1);

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toBeInstanceOf(AIMessage);
      const aiMessage = result.messages[0] as AIMessage;
      expect(aiMessage.content).toBe('');
      expect(aiMessage.tool_calls).toEqual(toolCalls);
    });

    it('should add ToolMessage instances for tool responses', async () => {
      const toolCalls = [
        { id: 'call-123', name: 'search_tool', args: { query: 'test' } },
      ];
      const toolMessages = [
        { id: 1, messageId: 1, toolCallId: 'call-123', text: 'Search result' },
      ];
      const messages: MessageWithUserAndToolMessages[] = [
        {
          id: 1,
          telegramMessageId: 123,
          chatId: BigInt(456),
          fromId: BigInt(789),
          sentAt: new Date(),
          editedAt: null,
          replyToMessageId: null,
          text: 'Using search tool',
          imageFileId: null,
          stickerFileId: null,
          toolCalls: toolCalls,
          messageAfterToolCallsId: null,
          from: {
            id: BigInt(789),
            isBot: true,
            firstName: 'Bot',
            lastName: null,
            username: 'testbot',
            languageCode: null,
          },
          toolMessages: toolMessages,
        },
      ];
      messageHistory.setMessages(messages);

      const result = await service.getConversation(1, 1);

      expect(result.messages).toHaveLength(2);
      expect(result.messages[0]).toBeInstanceOf(AIMessage);
      expect(result.messages[1]).toBeInstanceOf(ToolMessage);

      const toolMessage = result.messages[1] as ToolMessage;
      expect(toolMessage.tool_call_id).toBe('call-123');
      expect(toolMessage.content).toBe('Search result');
    });

    it('should handle multiple tool responses', async () => {
      const toolCalls = [
        { id: 'call-123', name: 'search_tool', args: { query: 'test' } },
        { id: 'call-456', name: 'calc_tool', args: { expression: '2+2' } },
      ];
      const toolMessages = [
        { id: 1, messageId: 1, toolCallId: 'call-123', text: 'Search result' },
        { id: 2, messageId: 1, toolCallId: 'call-456', text: '4' },
      ];
      const messages: MessageWithUserAndToolMessages[] = [
        {
          id: 1,
          telegramMessageId: 123,
          chatId: BigInt(456),
          fromId: BigInt(789),
          sentAt: new Date(),
          editedAt: null,
          replyToMessageId: null,
          text: 'Using multiple tools',
          imageFileId: null,
          stickerFileId: null,
          toolCalls: toolCalls,
          messageAfterToolCallsId: null,
          from: {
            id: BigInt(789),
            isBot: true,
            firstName: 'Bot',
            lastName: null,
            username: 'testbot',
            languageCode: null,
          },
          toolMessages: toolMessages,
        },
      ];
      messageHistory.setMessages(messages);

      const result = await service.getConversation(1, 1);

      expect(result.messages).toHaveLength(3);
      expect(result.messages[0]).toBeInstanceOf(AIMessage);
      expect(result.messages[1]).toBeInstanceOf(ToolMessage);
      expect(result.messages[2]).toBeInstanceOf(ToolMessage);

      const toolMessage1 = result.messages[1] as ToolMessage;
      const toolMessage2 = result.messages[2] as ToolMessage;
      expect(toolMessage1.tool_call_id).toBe('call-123');
      expect(toolMessage2.tool_call_id).toBe('call-456');
    });

    it('should handle JSON string tool calls', async () => {
      const toolCallsJson = JSON.stringify([
        { id: 'call-123', name: 'search_tool', args: { query: 'test' } },
      ]);
      const messages: MessageWithUserAndToolMessages[] = [
        {
          id: 1,
          telegramMessageId: 123,
          chatId: BigInt(456),
          fromId: BigInt(789),
          sentAt: new Date(),
          editedAt: null,
          replyToMessageId: null,
          text: 'Using search tool',
          imageFileId: null,
          stickerFileId: null,
          toolCalls: toolCallsJson,
          messageAfterToolCallsId: null,
          from: {
            id: BigInt(789),
            isBot: true,
            firstName: 'Bot',
            lastName: null,
            username: 'testbot',
            languageCode: null,
          },
          toolMessages: [],
        },
      ];
      messageHistory.setMessages(messages);

      const result = await service.getConversation(1, 1);

      expect(result.messages).toHaveLength(1);
      const aiMessage = result.messages[0] as AIMessage;
      expect(aiMessage.tool_calls).toEqual([
        { id: 'call-123', name: 'search_tool', args: { query: 'test' } },
      ]);
    });

    it('should skip messages that are too long', async () => {
      const longText = 'a'.repeat(10000); // Assuming MAX_INPUT_TEXT_LENGTH is less than this
      const messages: MessageWithUserAndToolMessages[] = [
        {
          id: 1,
          telegramMessageId: 123,
          chatId: BigInt(456),
          fromId: BigInt(789),
          sentAt: new Date(),
          editedAt: null,
          replyToMessageId: null,
          text: longText,
          imageFileId: null,
          stickerFileId: null,
          toolCalls: null,
          messageAfterToolCallsId: null,
          from: {
            id: BigInt(789),
            isBot: false,
            firstName: 'John',
            lastName: 'Doe',
            username: 'johndoe',
            languageCode: 'en',
          },
          toolMessages: [],
        },
      ];
      messageHistory.setMessages(messages);

      const result = await service.getConversation(1, 1);

      expect(result.messages).toHaveLength(0);
    });

    it('should not skip messages with tool calls even if text is too long', async () => {
      const longText = 'a'.repeat(10000); // Text that would normally be skipped
      const toolCalls = [
        { id: 'call-123', name: 'search_tool', args: { query: 'test' } },
      ];
      const messages: MessageWithUserAndToolMessages[] = [
        {
          id: 1,
          telegramMessageId: 123,
          chatId: BigInt(456),
          fromId: BigInt(789),
          sentAt: new Date(),
          editedAt: null,
          replyToMessageId: null,
          text: longText,
          imageFileId: null,
          stickerFileId: null,
          toolCalls: toolCalls,
          messageAfterToolCallsId: null,
          from: {
            id: BigInt(789),
            isBot: true,
            firstName: 'Bot',
            lastName: null,
            username: 'testbot',
            languageCode: null,
          },
          toolMessages: [],
        },
      ];
      messageHistory.setMessages(messages);

      const result = await service.getConversation(1, 1);

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toBeInstanceOf(AIMessage);
      const aiMessage = result.messages[0] as AIMessage;
      expect(aiMessage.tool_calls).toEqual(toolCalls);
    });

    it('should not skip messages with tool calls even if text is empty', async () => {
      const toolCalls = [
        { id: 'call-123', name: 'search_tool', args: { query: 'test' } },
      ];
      const messages: MessageWithUserAndToolMessages[] = [
        {
          id: 1,
          telegramMessageId: 123,
          chatId: BigInt(456),
          fromId: BigInt(789),
          sentAt: new Date(),
          editedAt: null,
          replyToMessageId: null,
          text: '',
          imageFileId: null,
          stickerFileId: null,
          toolCalls: toolCalls,
          messageAfterToolCallsId: null,
          from: {
            id: BigInt(789),
            isBot: true,
            firstName: 'Bot',
            lastName: null,
            username: 'testbot',
            languageCode: null,
          },
          toolMessages: [],
        },
      ];
      messageHistory.setMessages(messages);

      const result = await service.getConversation(1, 1);

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toBeInstanceOf(AIMessage);
      const aiMessage = result.messages[0] as AIMessage;
      expect(aiMessage.tool_calls).toEqual(toolCalls);
    });

    it('should handle image messages', async () => {
      const messages: MessageWithUserAndToolMessages[] = [
        {
          id: 1,
          telegramMessageId: 123,
          chatId: BigInt(456),
          fromId: BigInt(789),
          sentAt: new Date(),
          editedAt: null,
          replyToMessageId: null,
          text: 'Check this image',
          imageFileId: 'file123',
          stickerFileId: null,
          toolCalls: null,
          messageAfterToolCallsId: null,
          from: {
            id: BigInt(789),
            isBot: false,
            firstName: 'John',
            lastName: 'Doe',
            username: 'johndoe',
            languageCode: 'en',
          },
          toolMessages: [],
        },
      ];
      messageHistory.setMessages(messages);

      const result = await service.getConversation(1, 1);

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toBeInstanceOf(HumanMessage);
      const humanMessage = result.messages[0] as HumanMessage;
      expect(Array.isArray(humanMessage.content)).toBe(true);
      const content = humanMessage.content as {
        type: string;
        [key: string]: unknown;
      }[];
      expect(content).toHaveLength(2);
      expect(content[0]?.type).toBe('image_url');
      expect(content[1]?.type).toBe('text');
    });
  });
});
