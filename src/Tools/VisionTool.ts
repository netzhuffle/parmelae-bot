import { Tool } from 'langchain/tools';
import { ConversationService } from '../ConversationService';
import { GptModelsProvider } from '../GptModelsProvider';
import { SystemMessage } from 'langchain/schema';

export class VisionTool extends Tool {
  name = 'vision';

  description =
    'Use this to visually see images in attached photos [📸] or stickers [Sticker] in the current conversation. It will return you all necesarry information for the user request. Input is an empty string.';

  /** @param messageId - The last message of the conversation. */
  constructor(
    private readonly conversation: ConversationService,
    private readonly gptModels: GptModelsProvider,
    private readonly messageId: number,
  ) {
    super();
  }

  protected async _call(): Promise<string> {
    const conversation = await this.conversation.getConversation(
      this.messageId,
      true,
    );
    const reply = await this.gptModels.gpt4Vision.call([
      new SystemMessage(
        'You help the bot @ParmelaeBot to see images in a telegram chat. You will receive the conversation and write a message to @ParmelaeBot. Pay attention to the users’ requests and reply textually with as much visual information about the included images and stickers as possible so @ParmelaeBot can give a fully informed reply to the users’ messages.',
      ),
      ...conversation,
    ]);
    if (typeof reply.content === 'string') {
      return reply.content;
    }
    for (const content of reply.content) {
      if (content.type === 'text' && typeof content.text === 'string') {
        return content.text;
      }
    }
    return 'Sorry, I had technical difficulties and can not tell you what’s in the images. Please inform the users about this.';
  }
}
