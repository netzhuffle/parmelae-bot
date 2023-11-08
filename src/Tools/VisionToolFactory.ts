import { ConversationService } from '../ConversationService.js';
import { GptModelsProvider } from '../GptModelsProvider.js';
import { injectable } from 'inversify';
import { VisionTool } from './VisionTool.js';

@injectable()
export class VisionToolFactory {
  constructor(
    private readonly conversation: ConversationService,
    private readonly gptModels: GptModelsProvider,
  ) {}

  /**
   * Creates the vision tool.
   *
   * @param messageId - The last message of the conversation.
   */
  create(messageId: number): VisionTool {
    return new VisionTool(this.conversation, this.gptModels, messageId);
  }
}
