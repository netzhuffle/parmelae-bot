import { ConversationService } from './ConversationService.js';
import { MessageHistoryService } from './MessageHistoryService.js';
import { MessageRepositoryFake } from './Fakes/MessageRepositoryFake.js';
import { TelegramServiceFake } from './Fakes/TelegramServiceFake.js';
import { ConfigFake } from './Fakes/ConfigFake.js';
import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import { MessageRepository } from './Repositories/MessageRepository.js';

describe('ConversationService Integration', () => {
  let conversationService: ConversationService;
  let messageHistoryService: MessageHistoryService;
  let messageRepository: MessageRepositoryFake;
  let telegramService: TelegramServiceFake;
  let config: ConfigFake;

  beforeEach(() => {
    messageRepository = new MessageRepositoryFake();
    telegramService = new TelegramServiceFake();
    config = new ConfigFake();

    // Use real services for integration testing
    messageHistoryService = new MessageHistoryService(
      messageRepository as unknown as MessageRepository,
    );
    conversationService = new ConversationService(
      messageHistoryService,
      telegramService,
      config,
    );
  });

  afterEach(() => {
    messageRepository.reset();
  });

  describe('getConversation with tool call messages', () => {
    it('should include tool call messages in chronological order in the conversation flow', async () => {
      const chatId = BigInt(100);
      const botUserId = BigInt(999);
      const userUserId = BigInt(123);

      // 1. User message that triggers tool calls
      messageRepository.addMessage({
        id: 1,
        chatId,
        fromId: userUserId,
        text: 'What is the weather in London and what time is it?',
        from: {
          id: userUserId,
          isBot: false,
          firstName: 'John',
          lastName: 'Doe',
          username: 'johndoe',
          languageCode: 'en',
        },
        toolMessages: [],
        toolCallMessages: [],
      });

      // 2. Tool call announcement messages (these would be created during tool execution)
      const toolCallMessage1 = messageRepository.addMessage({
        id: 2,
        chatId,
        fromId: botUserId,
        text: 'Calling weather tool for London...',
        from: {
          id: botUserId,
          isBot: true,
          firstName: 'Bot',
          lastName: null,
          username: 'testbot',
          languageCode: null,
        },
        toolMessages: [
          {
            id: 1,
            messageId: 2,
            toolCallId: 'call-weather-123',
            text: 'Weather in London: Sunny, 22°C',
          },
        ],
        toolCallMessages: [],
      });

      const toolCallMessage2 = messageRepository.addMessage({
        id: 3,
        chatId,
        fromId: botUserId,
        text: 'Calling time tool for current time...',
        from: {
          id: botUserId,
          isBot: true,
          firstName: 'Bot',
          lastName: null,
          username: 'testbot',
          languageCode: null,
        },
        toolMessages: [
          {
            id: 2,
            messageId: 3,
            toolCallId: 'call-time-456',
            text: 'Current time: 14:30 UTC',
          },
        ],
        toolCallMessages: [],
      });

      // 3. Final AI response message that replies to the user message and links tool call messages
      messageRepository.addMessage({
        id: 4,
        chatId,
        fromId: botUserId,
        replyToMessageId: 1, // Reply to the original user message
        text: 'Based on the weather and time information, here is your answer: It is currently sunny and 22°C in London, and the time is 14:30 UTC.',
        from: {
          id: botUserId,
          isBot: true,
          firstName: 'Bot',
          lastName: null,
          username: 'testbot',
          languageCode: null,
        },
        toolCalls: [],
        toolMessages: [],
        toolCallMessages: [toolCallMessage1, toolCallMessage2], // Link to tool call messages
      });

      // Get the conversation starting from the final message
      const conversation = await conversationService.getConversation(4, 10);

      // Verify the complete conversation flow
      expect(conversation.messages).toHaveLength(6);

      // 1. User message
      expect(conversation.messages[0]).toBeInstanceOf(HumanMessage);
      expect(conversation.messages[0].content).toBe(
        'What is the weather in London and what time is it?',
      );

      // 2. First tool call announcement (converted to AIMessage)
      expect(conversation.messages[1]).toBeInstanceOf(AIMessage);
      expect(conversation.messages[1].content).toBe(
        'Calling weather tool for London...',
      );

      // 3. First tool response
      expect(conversation.messages[2]).toBeInstanceOf(ToolMessage);
      const toolMessage1 = conversation.messages[2] as ToolMessage;
      expect(toolMessage1.tool_call_id).toBe('call-weather-123');
      expect(toolMessage1.content).toBe('Weather in London: Sunny, 22°C');

      // 4. Second tool call announcement (converted to AIMessage)
      expect(conversation.messages[3]).toBeInstanceOf(AIMessage);
      expect(conversation.messages[3].content).toBe(
        'Calling time tool for current time...',
      );

      // 5. Second tool response
      expect(conversation.messages[4]).toBeInstanceOf(ToolMessage);
      const toolMessage2 = conversation.messages[4] as ToolMessage;
      expect(toolMessage2.tool_call_id).toBe('call-time-456');
      expect(toolMessage2.content).toBe('Current time: 14:30 UTC');

      // 6. Final AI response with tool calls
      expect(conversation.messages[5]).toBeInstanceOf(AIMessage);
      const finalAIMessage = conversation.messages[5] as AIMessage;
      expect(finalAIMessage.content).toBe(
        'Based on the weather and time information, here is your answer: It is currently sunny and 22°C in London, and the time is 14:30 UTC.',
      );
      expect(finalAIMessage.tool_calls).toEqual([]);
    });

    it('should handle conversation with single tool call and response', async () => {
      const chatId = BigInt(200);
      const botUserId = BigInt(999);
      const userUserId = BigInt(456);

      // User message
      messageRepository.addMessage({
        id: 10,
        chatId,
        fromId: userUserId,
        text: 'Search for information about TypeScript',
        from: {
          id: userUserId,
          isBot: false,
          firstName: 'Alice',
          lastName: 'Smith',
          username: 'alice',
          languageCode: 'en',
        },
        toolMessages: [],
        toolCallMessages: [],
      });

      // Tool call announcement message
      const searchToolCallMessage = messageRepository.addMessage({
        id: 11,
        chatId,
        fromId: botUserId,
        text: 'Searching for TypeScript information...',
        from: {
          id: botUserId,
          isBot: true,
          firstName: 'Bot',
          lastName: null,
          username: 'testbot',
          languageCode: null,
        },
        toolMessages: [
          {
            id: 10,
            messageId: 11,
            toolCallId: 'call-search-789',
            text: 'TypeScript is a strongly typed programming language that builds on JavaScript.',
          },
        ],
        toolCallMessages: [],
      });

      // Final response that replies to the user message
      messageRepository.addMessage({
        id: 12,
        chatId,
        fromId: botUserId,
        replyToMessageId: 10, // Reply to the original user message
        text: 'Here is what I found about TypeScript: TypeScript is a strongly typed programming language that builds on JavaScript.',
        from: {
          id: botUserId,
          isBot: true,
          firstName: 'Bot',
          lastName: null,
          username: 'testbot',
          languageCode: null,
        },
        toolCalls: [],
        toolMessages: [],
        toolCallMessages: [searchToolCallMessage],
      });

      const conversation = await conversationService.getConversation(12, 5);

      expect(conversation.messages).toHaveLength(4);

      // User message
      expect(conversation.messages[0]).toBeInstanceOf(HumanMessage);
      expect(conversation.messages[0].content).toBe(
        'Search for information about TypeScript',
      );

      // Tool call announcement
      expect(conversation.messages[1]).toBeInstanceOf(AIMessage);
      expect(conversation.messages[1].content).toBe(
        'Searching for TypeScript information...',
      );

      // Tool response
      expect(conversation.messages[2]).toBeInstanceOf(ToolMessage);
      const toolMessage = conversation.messages[2] as ToolMessage;
      expect(toolMessage.tool_call_id).toBe('call-search-789');
      expect(toolMessage.content).toBe(
        'TypeScript is a strongly typed programming language that builds on JavaScript.',
      );

      // Final AI response
      expect(conversation.messages[3]).toBeInstanceOf(AIMessage);
      const aiMessage = conversation.messages[3] as AIMessage;
      expect(aiMessage.content).toBe(
        'Here is what I found about TypeScript: TypeScript is a strongly typed programming language that builds on JavaScript.',
      );
      expect(aiMessage.tool_calls).toEqual([]);
    });

    it('should handle conversation without tool call messages', async () => {
      const chatId = BigInt(300);
      const userUserId = BigInt(789);

      // Simple user message without any tool calls
      messageRepository.addMessage({
        id: 20,
        chatId,
        fromId: userUserId,
        text: 'Hello, how are you?',
        from: {
          id: userUserId,
          isBot: false,
          firstName: 'Bob',
          lastName: 'Johnson',
          username: 'bob',
          languageCode: 'en',
        },
        toolMessages: [],
        toolCallMessages: [],
      });

      // Simple bot response without tool calls that replies to user message
      messageRepository.addMessage({
        id: 21,
        chatId,
        fromId: BigInt(999),
        replyToMessageId: 20, // Reply to the original user message
        text: 'Hello! I am doing well, thank you for asking.',
        from: {
          id: BigInt(999),
          isBot: true,
          firstName: 'Bot',
          lastName: null,
          username: 'testbot',
          languageCode: null,
        },
        toolMessages: [],
        toolCallMessages: [],
      });

      const conversation = await conversationService.getConversation(21, 5);

      expect(conversation.messages).toHaveLength(2);

      // User message
      expect(conversation.messages[0]).toBeInstanceOf(HumanMessage);
      expect(conversation.messages[0].content).toBe('Hello, how are you?');

      // Bot response
      expect(conversation.messages[1]).toBeInstanceOf(AIMessage);
      expect(conversation.messages[1].content).toBe(
        'Hello! I am doing well, thank you for asking.',
      );
    });
  });
});
