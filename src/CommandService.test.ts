import { CommandService } from './CommandService.js';
import { Commands } from './Command.js';
import { ReplyGenerator } from './MessageGenerators/ReplyGenerator.js';
import { TelegramMessageWithReplyTo } from './Repositories/Types.js';

jest.mock('./MessageGenerators/ReplyGenerator.js');

describe('CommandService', () => {
  let commandService: CommandService;
  let replyGenerator: jest.Mocked<ReplyGenerator>;

  beforeEach(() => {
    replyGenerator = {
      generate: jest.fn(),
    } as unknown as jest.Mocked<ReplyGenerator>;
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
      replyToMessage: messageToReplyTo,
    };
    replyGenerator.generate.mockImplementation(
      async (message, announceToolCall) => {
        const messageId = await announceToolCall('Using tool X');
        expect(messageId).toBeNull(); // Should return null since no message is stored
        return 'This is a comment';
      },
    );

    const result = await commandService.execute(Commands.Comment, message);

    expect(result).toBe('Using tool X\nThis is a comment');
  });
});
