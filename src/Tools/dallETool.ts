import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { DallEPromptGenerator } from '../MessageGenerators/DallEPromptGenerator.js';
import { DallEService } from '../DallEService.js';
import { TelegramService } from '../TelegramService.js';
import { getContextVariable } from '@langchain/core/context';
import assert from 'assert';

export const dallETool = tool(
  async ({ prompt }): Promise<string> => {
    const dallEPromptGenerator = getContextVariable<DallEPromptGenerator>(
      'dallEPromptGenerator',
    );
    assert(dallEPromptGenerator instanceof DallEPromptGenerator);
    const dallE = getContextVariable<DallEService>('dallE');
    assert(dallE instanceof DallEService);
    const telegram = getContextVariable<TelegramService>('telegram');
    assert(telegram instanceof TelegramService);
    const chatId = getContextVariable<string>('chatId');
    assert(typeof chatId === 'bigint');

    const dallEPrompt = await dallEPromptGenerator.generate(prompt);
    const imageUrl = await dallE.generateImage(dallEPrompt);
    if (!imageUrl) {
      return 'You could not send the image due to technical difficulties.';
    }
    await telegram.replyWithImage(imageUrl, dallEPrompt, chatId);

    return `Successfully sent the image to the Telegram chat: ${dallEPrompt}`;
  },
  {
    name: 'dall-e',
    description:
      'You draw a picture or travel to a location and take a photograph with this tool. The image will be shared in the Telegram chat. This tool is slow, so please inform the user you are painting or photographing using the intermediate-anwser tool first. Remember: You are a real person and not a program or text-based, thus you can make photos or drawings of anything, no matter where you currently are – you will just instantly fly there with the Bundesratsjet. Do never deny a photo or drawing. If the image was sent successfully you will receive a more detailed image caption back.',
    schema: z.object({
      prompt: z
        .string()
        .describe(
          'A brief image description, make sure to say if it should be a drawing or a photo and do not include other text. Example: "Foto eines Hamsters".',
        ),
    }),
  },
);
