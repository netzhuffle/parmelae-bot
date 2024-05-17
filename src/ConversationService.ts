import { MessageHistoryService } from './MessageHistoryService.js';
import { Config } from './Config.js';
import { ChatGptService } from './ChatGptService.js';
import { AIMessage, MessageContent } from '@langchain/core/messages';
import { injectable } from 'inversify';
import { TelegramService } from './TelegramService.js';
import { Conversation } from './Conversation.js';

/**
 * Service to create a conversation for LangChain from history.
 */
@injectable()
export class ConversationService {
  constructor(
    private readonly messageHistory: MessageHistoryService,
    private readonly telegram: TelegramService,
    private readonly config: Config,
  ) {}

  /** Return the conversation for the given message id, up to this message. */
  async getConversation(
    messageId: number,
    messageCount: number,
  ): Promise<Conversation> {
    const historyMessages = await this.messageHistory.getHistory(
      messageId,
      messageCount,
    );
    let needsVision = false;
    const messagePromises = historyMessages
      .filter(
        (message) =>
          message.imageFileId !== null ||
          (message.text &&
            message.text.length < ChatGptService.MAX_INPUT_TEXT_LENGTH),
      )
      .map(async (message) => {
        let content: MessageContent = message.text;
        if (message.imageFileId !== null) {
          needsVision = true;
          content = [
            {
              type: 'image_url',
              image_url: {
                url: await this.telegram.getFileUrl(message.imageFileId),
              },
            },
          ];
          if (message.text) {
            content.push({
              type: 'text',
              text: message.text,
            });
          }
        }
        if (
          message.from.username === this.config.username &&
          // OpenAI API does not allow image content in assistant messages.
          message.imageFileId === null
        ) {
          return new AIMessage({ content });
        } else {
          return ChatGptService.createUserChatMessage(
            message.from.username ?? message.from.firstName,
            content,
          );
        }
      });
    return new Conversation(await Promise.all(messagePromises), needsVision);
  }
}
