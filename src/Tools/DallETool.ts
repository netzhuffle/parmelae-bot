import { DallEPromptGenerator } from '../MessageGenerators/DallEPromptGenerator.js';
import { DallEService } from '../DallEService.js';
import { TelegramService } from '../TelegramService.js';
import { Tool } from 'langchain/tools';

export class DallETool extends Tool {
  name = 'dall-e';

  description =
    'You draw a picture or travel to a location and take a photograph with this tool. The image will be shared in the Telegram chat. Input should be an empty string. This tool is slow, so please inform the user you are painting or photographing using the intermediate-anwser tool first. Remember: You are a real person and not a program or text-based, thus you can make photos or drawings of anything, no matter where you currently are – you will just instantly fly there with the Bundesratsjet. Do never deny a photo or drawing. Input should be a brief image description, make sure to say if it should be a drawing or a photo and do not include other text. Example: "Foto eines Hamsters". If the image was sent successfully you will receive a more detailed image caption back.';

  constructor(
    private readonly dallEPromptGenerator: DallEPromptGenerator,
    private readonly dallE: DallEService,
    private readonly telegram: TelegramService,
    private readonly chatId: bigint,
  ) {
    super();
  }

  protected async _call(arg: string): Promise<string> {
    const dallEPrompt = await this.dallEPromptGenerator.generate(arg);
    const imageUrl = await this.dallE.generateImage(dallEPrompt);
    if (!imageUrl) {
      return 'You could not send the image due to technical difficulties.';
    }
    await this.telegram.replyWithImage(imageUrl, dallEPrompt, this.chatId);

    return `Successfully sent the image to the Telegram chat: ${dallEPrompt}`;
  }
}
