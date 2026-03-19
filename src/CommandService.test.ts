import { beforeEach, describe, it, mock, expect } from 'bun:test';

import { Commands } from './Command.js';
import { CommandService } from './CommandService.js';
import { MessageModel } from './generated/prisma/models/Message.js';
import { ReplyGenerator } from './MessageGenerators/ReplyGenerator.js';
import { TelegramMessageWithReplyTo } from './Repositories/Types.js';
import { StreamingTextSink } from './StreamingTextSink.js';

describe('CommandService', () => {
  let commandService: CommandService;
  let replyGenerator: ReplyGenerator;

  beforeEach(() => {
    replyGenerator = {
      generate: mock(),
    } as unknown as ReplyGenerator;
    commandService = new CommandService(replyGenerator);
  });

  it('should return comment when asked for comment', async () => {
    const messageToReplyTo = {
      id: 123,
      telegramMessageId: 123,
      chatId: BigInt(456),
      fromId: BigInt(789),
      sentAt: new Date(),
      editedAt: null,
      replyToMessageId: null,
      text: 'some message text',
      imageFileId: null,
      stickerFileId: null,
      toolCalls: null,
      messageAfterToolCallsId: null,
    };
    const message: TelegramMessageWithReplyTo = {
      id: 234,
      telegramMessageId: 234,
      chatId: BigInt(456),
      fromId: BigInt(789),
      sentAt: new Date(),
      editedAt: null,
      replyToMessageId: 123,
      text: '/comment',
      imageFileId: null,
      stickerFileId: null,
      toolCalls: null,
      messageAfterToolCallsId: null,
      replyToMessage: messageToReplyTo,
    };
    const streamedText: string[] = [];
    const streamSink: StreamingTextSink = {
      appendText: async (text) => {
        streamedText.push(text);
      },
      reset: async () => {
        return;
      },
    };
    replyGenerator.generate = mock(
      async (
        replyTarget: MessageModel,
        announceToolCall: (text: string) => Promise<number | null>,
      ) => {
        expect(replyTarget.id).toBe(messageToReplyTo.id);
        const messageId = await announceToolCall('Using tool X');
        expect(messageId).toBeNull(); // Should return null since no message is stored
        return {
          text: 'This is a comment',
          toolCallMessageIds: [],
        };
      },
    );

    const result = await commandService.execute(Commands.Comment, message, streamSink);

    expect(result).toBe('Using tool X\nThis is a comment');
    expect(streamedText).toEqual(['Using tool X\n']);
  });
});
