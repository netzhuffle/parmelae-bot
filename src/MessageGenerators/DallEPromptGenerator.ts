import {
  AIMessagePromptTemplate,
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from '@langchain/core/prompts';
import { ChatGptService } from '../ChatGptService.js';
import { GptModels } from '../GptModelsProvider.js';
import { injectable } from 'inversify';

/** The prompt messages. */
const PROMPT = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(
    'Generiere einen Dall-E-Prompt für wunderschöne Kunst oder Fotos basierend auf einer simplen Anfrage. Dall-E-Prompts sind englisch, übertrieben detailliert beschrieben, mit hohen Qualitätsforderungen, jedoch nah an der ursprünglichen Anfrage.',
  ),
  HumanMessagePromptTemplate.fromTemplate('Zeichnung eines Hamsters'),
  AIMessagePromptTemplate.fromTemplate(
    'Drawing of a hamster, high quality, professional drawing, highly detailed epic, trending on art station.',
  ),
  HumanMessagePromptTemplate.fromTemplate('Foto des Bundeshaus in Bern'),
  AIMessagePromptTemplate.fromTemplate(
    'Photo of the Swiss Federal Palace, in 4k high resolution, professional photo for magazine, 35mm camera 3.4f, hyper detailed.',
  ),
  HumanMessagePromptTemplate.fromTemplate('{description}'),
]);

/** Creates Dall-E prompts. */
@injectable()
export class DallEPromptGenerator {
  constructor(private readonly chatGpt: ChatGptService) {}

  /**
   * Generates a DALL-E prompt.
   * @param description - The image description.
   * @return The prompt.
   */
  async generate(description: string): Promise<string> {
    const message = await this.chatGpt.generate(PROMPT, GptModels.Cheap, {
      description,
    });
    return message.content;
  }
}
