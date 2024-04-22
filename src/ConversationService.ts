import { MessageHistoryService } from './MessageHistoryService.js';
import { Config } from './Config.js';
import { ChatGptService } from './ChatGptService.js';
import {
  AIMessage,
  BaseMessage,
  MessageContent,
} from '@langchain/core/messages';
import { injectable } from 'inversify';
import { TelegramService } from './TelegramService.js';

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

  /**
   * Return the conversation for the given message id, up to this message.
   *
   * @param isForVision - Whether the conversation is for the GPT Vision API.
   */
  async getConversation(
    messageId: number,
    isForVision = false,
  ): Promise<BaseMessage[]> {
    const historyMessages = await this.messageHistory.getHistory(messageId);
    const conversationPromises = historyMessages
      .filter(
        (message) =>
          message.text &&
          message.text.length < ChatGptService.MAX_INPUT_TEXT_LENGTH,
      )
      .map(async (message) => {
        if (message.from.username === this.config.username) {
          const text = message.text ?? 'Ich bin sprachlos.';
          return new AIMessage(text);
        } else {
          let content: MessageContent = message.text;
          if (isForVision && message.imageFileId !== null) {
            content = [
              {
                type: 'text',
                text: message.text,
              },
              {
                type: 'image_url',
                image_url: await this.telegram.getFileUrl(message.imageFileId),
              },
            ];
          }
          return ChatGptService.createUserChatMessage(
            message.from.username ?? message.from.firstName,
            content,
          );
        }
      });
    return Promise.all(conversationPromises);
  }
}
