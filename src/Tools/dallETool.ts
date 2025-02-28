import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { LangGraphRunnableConfig } from '@langchain/langgraph';
import { getToolContext } from '../ChatGptAgentService.js';

export const dallETool = tool(
  async ({ prompt }, config: LangGraphRunnableConfig): Promise<string> => {
    const context = getToolContext(config);
    const chatId = context.chatId;
    const dallEPromptGenerator = context.dallEPromptGenerator;
    const dallE = context.dallEService;
    const telegram = context.telegramService;

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
